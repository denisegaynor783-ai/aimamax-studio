// ============================================================
// AIMAMAX Studio — 角色库（参考 LibTV 角色库）
// 布局：顶部角色详情（多角度图+标签+描述+应用至画布）
//       底部角色筛选 + 横向滚动卡片列表
// ============================================================
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Character, listCharacters, filterCharacters,
  touchCharacter,
  type CharFilter, type CharGender, type CharEra, type CharStyle,
} from "../lib/characters";
import { useStudio } from "../lib/store";
import { IconClose, IconCharacter, IconSpark } from "../components/icons";

// ── 标签渲染 ──
function TagChip({ children, tone = "default", onRemove }: { children: React.ReactNode; tone?: string; onRemove?: () => void }) {
  const tones: Record<string, string> = {
    default: "var(--line)", gender: "var(--film)", era: "var(--info)", style: "var(--ok)",
  };
  return (
    <span className="char-tag" style={{ borderColor: tones[tone] || tones.default, color: tones[tone] || "var(--text)" }}>
      {children}
      {onRemove && <button className="char-tag__x" onClick={onRemove}>×</button>}
    </span>
  );
}

// ── 图片网格（多角度参考图） ──
function ImageGallery({ images, name }: { images: Character["images"]; name: string }) {
  const hasAny = images.fullBody || images.portrait || (images.multiAngle?.length ?? 0) > 0 ||
    (images.sideViews?.length ?? 0) > 0 || (images.expressions?.length ?? 0) > 0;
  if (!hasAny) {
    // 无真实图片时显示占位色块（模拟截图中的布局）
    return (
      <div className="char-gallery char-gallery--placeholder">
        <div className="char-gallery__slot char-gallery__slot--body" title="全身立绘">
          <div className="char-gallery__placeholder"><IconCharacter size={40} /><span>全身立绘</span></div>
        </div>
        <div className="char-gallery__slot char-gallery__slot--portrait" title="肖像">
          <div className="char-gallery__placeholder"><IconCharacter size={32} /><span>肖像</span></div>
        </div>
        <div className="char-gallery__slot char-gallery__slot--grid" title="多角度面部">
          <div className="char-gallery__grid3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="char-gallery__grid-cell"><IconCharacter size={14} /></div>
            ))}
          </div>
        </div>
        <div className="char-gallery__slot char-gallery__slot--side" title="侧面/背面">
          <div className="char-gallery__side-views">
            {[1, 2, 3].map((i) => (
              <div key={i} className="char-gallery__side-cell"><IconCharacter size={18} /></div>
            ))}
          </div>
        </div>
        <div className="char-gallery__slot char-gallery__slot--expr" title="表情变体">
          <div className="char-gallery__expr-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="char-gallery__expr-cell"><IconCharacter size={16} /></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="char-gallery">
      {images.fullBody && <div className="char-gallery__slot char-gallery__slot--body"><img src={images.fullBody} alt={`${name} 全身`} /></div>}
      {images.portrait && <div className="char-gallery__slot char-gallery__slot--portrait"><img src={images.portrait} alt={`${name} 肖像`} /></div>}
      {images.multiAngle && images.multiAngle.length > 0 && (
        <div className="char-gallery__slot char-gallery__slot--grid">
          <div className="char-gallery__grid3">
            {images.multiAngle.map((src, i) => (<img key={i} src={src} alt={`角度${i + 1}`} />))}
          </div>
        </div>
      )}
      {images.sideViews && images.sideViews.length > 0 && (
        <div className="char-gallery__slot char-gallery__slot--side">
          <div className="char-gallery__side-views">{images.sideViews.map((src, i) => (<img key={i} src={src} alt={`侧面${i + 1}`} />))}</div>
        </div>
      )}
      {images.expressions && images.expressions.length > 0 && (
        <div className="char-gallery__slot char-gallery__slot--expr">
          <div className="char-gallery__expr-grid">{images.expressions.map((src, i) => (<img key={i} src={src} alt={`表情${i + 1}`} />))}</div>
        </div>
      )}
    </div>
  );
}

// ── 角色卡片（底部横向列表） ──
function CharCard({ ch, active, onClick }: { ch: Character; active: boolean; onClick: () => void }) {
  const thumb = ch.images?.portrait || ch.images?.fullBody;
  return (
    <button className={`char-card ${active ? "char-card--active" : ""}`} onClick={onClick}>
      <div className="char-card__img">
        {thumb ? <img src={thumb} alt={ch.name} /> : <div className="char-card__avatar"><IconCharacter size={28} /></div>}
      </div>
      <div className="char-card__name">{ch.name}</div>
    </button>
  );
}

// ── 主面板 ──
export default function Characters() {
  const [chars, setChars] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CharFilter>({});
  const [recentOnly, setRecentOnly] = useState(false);
  const [toast, setToast] = useState("");
  // 状态拆资产选中（Hell Grind：@角色_wet / @角色_blood 独立资产）
  const [stateKey, setStateKey] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 加载角色
  useEffect(() => {
    listCharacters().then(setChars);
  }, []);

  // 切换角色时重置状态选中
  useEffect(() => { setStateKey(null); }, [selectedId]);

  // 筛选 + 排序
  const display = useMemo(() => {
    let result = filterCharacters(chars, filter);
    if (recentOnly) {
      result = result.filter((c) => c.lastUsedAt).sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
    }
    return result;
  }, [chars, filter, recentOnly]);

  const selected = useMemo(() => chars.find((c) => c.id === selectedId), [chars, selectedId]);
  const firstId = display[0]?.id;

  // 带状态资产文本（descriptor + 选中状态变体 + GEO 锚点），逐字粘贴用
  const assetText = useMemo(() => {
    if (!selected) return "";
    const parts: string[] = [selected.descriptor || selected.description];
    const sv = selected.stateVariants?.find((v) => v.key === stateKey);
    if (sv) parts.push(sv.descriptor);
    if (selected.geoAnchor) parts.push(selected.geoAnchor);
    return parts.join("\n\n");
  }, [selected, stateKey]);

  // 初始选中第一个
  useEffect(() => {
    if (!selectedId && firstId) setSelectedId(firstId);
  }, [firstId, selectedId]);

  // 应用至画布
  const applyToCanvas = useCallback(async () => {
    if (!selected) return;
    const { addNode, updateNodePayload } = useStudio.getState();
    const id = addNode("character", { x: 120 + Math.random() * 200, y: 120 + Math.random() * 160 });
    if (id) {
      const tagStr = [
        selected.tags.gender, selected.tags.era, selected.tags.age, selected.tags.style,
        ...(selected.tags.custom || []),
      ].filter(Boolean).join(" / ");
      const stateLabel = selected.stateVariants?.find((v) => v.key === stateKey)?.label;
      const filledTemplate = selected.promptTemplate
        ?.replace(/{name}/g, selected.name)
        .replace(/{gender}/g, selected.tags.gender || "")
        .replace(/{style}/g, selected.tags.style || "")
        .replace(/{era}/g, selected.tags.era || "")
        .replace(/{age}/g, selected.tags.age || "");
      updateNodePayload(id, {
        label: selected.name,
        // 优先用逐字 descriptor（外部记忆），无则用模板
        prompt: (selected.descriptor || filledTemplate || selected.description) as string,
        note: (tagStr + (stateLabel ? ` · ${stateLabel}` : "")) as string,
        fields: {
          "性别": selected.tags.gender || "",
          "时代": selected.tags.era || "",
          "年龄": selected.tags.age || "",
          "风格": selected.tags.style || "",
          "文本描述符": selected.descriptor || "—",
          "状态资产": stateLabel || "默认",
          "GEO 锚点": selected.geoAnchor || "—",
          "描述": selected.description,
        },
      });
      await touchCharacter(selected.id);
      setToast(`「${selected.name}」${stateLabel ? `（${stateLabel}）` : ""}已添加到画布`);
      setTimeout(() => setToast(""), 2200);
    }
  }, [selected, stateKey]);

  // 筛选选项
  const GENDERS: CharGender[] = ["女主", "男主", "女配", "男配", "中性"];
  const ERAS: CharEra[] = ["现代", "古风", "未来", "民国", "奇幻"];
  const STYLES: CharStyle[] = ["甜美", "酷飒", "温婉", "英气", "邪魅", "清纯", "成熟", "呆萌"];

  return (
    <div className="char-lib">
      {/* 头部 */}
      <div className="char-lib__head">
        <h2><IconCharacter size={20} /> 角色库</h2>
        <button className="char-lib__close" onClick={() => history.back()} title="关闭"><IconClose size={18} /></button>
      </div>

      {/* 角色详情区 */}
      {selected ? (
        <div className="char-detail">
          {/* 名字 + 标签行 */}
          <div className="char-detail__header">
            <h3 className="char-detail__name">{selected.name}</h3>
            <div className="char-detail__tags">
              {selected.tags.gender && <TagChip tone="gender">{selected.tags.gender}</TagChip>}
              {selected.tags.era && <TagChip tone="era">{selected.tags.era}</TagChip>}
              {selected.tags.age && <TagChip>{selected.tags.age}</TagChip>}
              {selected.tags.style && <TagChip tone="style">{selected.tags.style}</TagChip>}
              {(selected.tags.custom || []).map((t, i) => <TagChip key={i}>{t}</TagChip>)}
            </div>
          </div>

          {/* 多角度图片画廊 */}
          <ImageGallery images={selected.images} name={selected.name} />

          {/* 状态拆资产切换（Hell Grind：@角色_wet / @角色_blood） */}
          {selected.stateVariants && selected.stateVariants.length > 0 && (
            <div className="char-states">
              <div className="char-states__label">状态拆资产（独立资产，逐镜不串状态）</div>
              <div className="char-states__tabs">
                <button className="char-state-tab" data-active={stateKey === null} onClick={() => setStateKey(null)}>默认</button>
                {selected.stateVariants.map((v) => (
                  <button key={v.key} className="char-state-tab" data-active={stateKey === v.key} onClick={() => setStateKey(v.key)}>{v.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* GEO 空间锚点 */}
          {selected.geoAnchor && (
            <div className="char-geo">
              <div className="char-geo__label">GEO 空间锚点（逐镜原样粘贴）</div>
              <pre className="char-geo__text">{selected.geoAnchor}</pre>
            </div>
          )}

          {/* 无头图锚点说明 */}
          {selected.noHeadFigure && (
            <div className="char-note">⚓ 无头全身图锚点：远景请只从高清面部特写取脸，避免从全身小图捞模糊脸。</div>
          )}

          {/* 描述 */}
          <p className="char-detail__desc">{selected.description}</p>

          {/* 操作栏 */}
          <div className="char-detail__actions">
            <button className="btn btn--primary btn--glow" onClick={applyToCanvas}>
              <IconSpark size={15} /> 应用至画布
            </button>
            {selected.descriptor && (
              <button className="btn btn--sm" onClick={() => {
                navigator.clipboard.writeText(assetText).then(() => { setToast("带状态资产已复制（descriptor+状态+GEO）"); setTimeout(() => setToast(""), 1800); });
              }}>
                复制带状态资产
              </button>
            )}
            {selected.promptTemplate && (
              <button className="btn btn--sm" onClick={() => {
                navigator.clipboard.writeText(
                  selected.promptTemplate!.replace(/{name}/g, selected.name)
                    .replace(/{gender}/g, selected.tags.gender || "")
                    .replace(/{style}/g, selected.tags.style || "")
                    .replace(/{era}/g, selected.tags.era || "")
                    .replace(/{age}/g, selected.tags.age || "")
                ).then(() => { setToast("提示词模板已复制"); setTimeout(() => setToast(""), 1800); });
              }}>
                复制提示词模板
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="char-detail char-detail--empty">
          <IconCharacter size={48} />
          <p>选择一个角色查看详情</p>
        </div>
      )}

      {/* 分隔线 */}
      <div className="char-lib__divider" />

      {/* 底部：筛选 + 卡片列表 */}
      <div className="char-browser">
        <div className="char-browser__bar">
          <select
            className="select select--sm"
            value={filter.gender ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, gender: (e.target.value || undefined) as CharGender | undefined }))}
          >
            <option value="">角色筛选</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <select
            className="select select--sm"
            value={filter.era ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, era: (e.target.value || undefined) as CharEra | undefined }))}
          >
            <option value="">全部时代</option>
            {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          <select
            className="select select--sm"
            value={filter.style ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, style: (e.target.value || undefined) as CharStyle | undefined }))}
          >
            <option value="">全部风格</option>
            {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className="char-browser__recent">
            <input type="checkbox" checked={recentOnly} onChange={(e) => setRecentOnly(e.target.checked)} />
            最近使用
          </label>
        </div>

        {/* 横向滚动卡片列表 */}
        <div className="char-browser__list" ref={scrollRef}>
          {display.length === 0 && (
            <div className="char-browser__empty">没有匹配的角色</div>
          )}
          {display.map((ch) => (
            <CharCard
              key={ch.id}
              ch={ch}
              active={ch.id === selectedId}
              onClick={() => { setSelectedId(ch.id); touchCharacter(ch.id); }}
            />
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="char-toast">{toast}</div>}
    </div>
  );
}
