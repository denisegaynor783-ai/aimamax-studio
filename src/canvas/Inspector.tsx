// ============================================================
// AIMAMAX Studio — 检视器（右侧）：编辑选中节点 / 触发生成 / 结果画廊
// ============================================================
import { useStudio } from "../lib/store";
import { Button, IconButton, Field, Badge, EmptyState, Spinner } from "../components/ui";
import { IconTrash, IconSpark, IconImage, IconVideo, IconText, IconPlus, IconChevron, IconLink2 } from "../components/icons";
import { getContext, KIND_FIELDS } from "../lib/graph";
import type { AssetKind, GenKind, NodeKind, ProviderConfig } from "../lib/types";

const KIND_LABEL: Record<NodeKind, string> = {
  character: "角色卡", scene: "场景卡", shot: "分镜格", asset: "素材", prompt: "生成任务", music: "音乐轨", text: "文本 / 脚本",
  script: "剧本卡片", generator: "AI 生成器", group: "节点分组",
};

function assetKindOf(k: NodeKind): AssetKind {
  if (k === "character") return "character";
  if (k === "scene") return "scene";
  if (k === "music") return "music";
  return "prop";
}

/* ── 结构化字段编辑器（角色/场景/分镜/音乐） ── */
function KindFieldsEditor({ kind, fields, onChange }: { kind: NodeKind; fields: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
  const spec = KIND_FIELDS[kind];
  if (!spec || spec.length === 0) return null;
  return (
    <div className="insp-fields">
      <div className="eyebrow" style={{ marginBottom: 8 }}>结构化设定 {kind !== "music" ? "（注入生成上下文）" : "（注入配乐上下文）"}</div>
      {spec.map((f) => (
        <Field key={f.key} label={f.label}>
          <input
            className="input"
            value={fields[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={(e) => onChange({ ...fields, [f.key]: e.target.value })}
          />
        </Field>
      ))}
    </div>
  );
}

/* ── 上游上下文面板：列出所有连入本节点的节点，说明其参与生成 ── */
const REL_LABEL: Record<string, string> = { sequence: "时序", reference: "引用", audio: "音频" };
const CTX_KIND_LABEL: Record<string, string> = {
  character: "角色", scene: "场景", shot: "分镜", music: "配乐", script: "剧本", text: "文本", asset: "素材", generator: "生成器", prompt: "生成",
};
function UpstreamContext({ nodeId }: { nodeId: string }) {
  const { nodes, edges } = useStudio();
  const ctx = getContext(nodes, edges, nodeId);
  const items = [...ctx.characters, ...ctx.scenes, ...ctx.musics, ...ctx.scripts, ...ctx.texts, ...ctx.assets];
  if (items.length === 0) {
    return (
      <div className="insp-ctx insp-ctx--empty">
        <span className="eye">⬡</span> 暂无上游。从左侧节点拉一条连线到本节点，设定会参与生成。
      </div>
    );
  }
  return (
    <div className="insp-ctx">
      <div className="eyebrow" style={{ marginBottom: 6 }}>上游上下文 · {items.length} 个节点参与生成</div>
      <div className="insp-ctx__list">
        {items.map((it) => (
          <div key={it.id} className="insp-ctx__item" data-kind={it.kind}>
            <span className="insp-ctx__kind">{CTX_KIND_LABEL[it.kind] ?? it.kind}</span>
            <span className="insp-ctx__label truncate">{it.label}</span>
            <span className="insp-ctx__rel" data-rel={it.rel}>{REL_LABEL[it.rel] ?? it.rel}</span>
            {it.summary && <span className="insp-ctx__summary">{it.summary}</span>}
          </div>
        ))}
      </div>
      <div className="faint" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
        以上节点通过连线把角色一致性 / 场景氛围 / 配乐情绪 / 参考图流入本节点生成。
      </div>
    </div>
  );
}

export function Inspector({ onCollapse }: { onCollapse?: () => void }) {
  const { selectedNodeId, nodes, settings, updateNodeData, updateNodePayload, generateFromNode, deleteNode, addAsset, busy, busyNodeId, toggleGroup, ungroupNodes, assetToGenerator, resultToAssetNode } =
    useStudio();
  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="inspector">
        <div className="inspector__empty">
          <EmptyState
            icon={<IconSpark size={26} />}
            title="未选中节点"
            hint="在画布上点选一个节点以编辑内容、触发 AI 生成并查看结果。"
          />
        </div>
      </div>
    );
  }

  const d = node.data;
  const providers = settings.providers;

  // 分组节点：专属检视器（折叠 / 解组）
  if (d.kind === "group") {
    const collapsed = !!d.payload.collapsed;
    const count = d.payload.count ?? 0;
    return (
      <div className="inspector">
        <div className="inspector__head">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Badge tone="film">节点分组</Badge>
            <div style={{ display: "flex", gap: 4 }}>
              {onCollapse && (
                <IconButton title="收起检视器" onClick={onCollapse}>
                  <IconChevron size={16} />
                </IconButton>
              )}
              <IconButton title="删除分组" onClick={() => deleteNode(node.id)}>
                <IconTrash size={16} />
              </IconButton>
            </div>
          </div>
        </div>
        <div className="inspector__body">
          <Field label="分组名称">
            <input className="input" value={d.label} onChange={(e) => updateNodeData(node.id, { label: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 8, margin: "6px 0 18px" }}>
            <Button variant="ghost" size="sm" block onClick={() => toggleGroup(node.id)}>{collapsed ? "展开分组" : "折叠分组"}</Button>
            <Button variant="danger" size="sm" block onClick={() => ungroupNodes(node.id)}>解组</Button>
          </div>
          <div className="faint" style={{ fontSize: 12, lineHeight: 1.6 }}>
            包含 {count} 个节点{collapsed ? "（已折叠，成员节点在画布上隐藏）" : "（拖动分组时成员节点会一起移动）"}。
          </div>
        </div>
      </div>
    );
  }
  // 选中接口（Provider）：节点显式指定优先，否则跟随默认
  const chosenProv = providers.find((p: ProviderConfig) => p.id === d.payload.provider);
  const busyThis = busy && busyNodeId === node.id;
  const isVisual = d.kind !== "text" && d.kind !== "music";
  const isAudio = d.kind === "music";

  const collect = async (url?: string, text?: string) => {
    await addAsset({
      id: crypto.randomUUID(),
      kind: assetKindOf(d.kind),
      name: d.label,
      preview: url,
      sourceNodeId: node.id,
      tags: [d.kind],
      createdAt: Date.now(),
    });
    alert(text ? "文本已收藏到资产库" : "已收藏到资产库");
  };

  const gen = (kind: GenKind, model?: string) => generateFromNode(node.id, kind, model);

  return (
    <div className="inspector">
      <div className="inspector__head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Badge tone="film">{KIND_LABEL[d.kind]}</Badge>
          <div style={{ display: "flex", gap: 4 }}>
            {onCollapse && (
              <IconButton title="收起检视器" onClick={onCollapse}>
                <IconChevron size={16} />
              </IconButton>
            )}
            <IconButton title="删除节点" onClick={() => deleteNode(node.id)}>
              <IconTrash size={16} />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="inspector__body">
        <Field label="名称">
          <input className="input" value={d.label} onChange={(e) => updateNodeData(node.id, { label: e.target.value })} />
        </Field>

        {/* 结构化字段（角色/场景/分镜/音乐） */}
        <KindFieldsEditor kind={d.kind} fields={d.payload.fields ?? {}} onChange={(next) => updateNodePayload(node.id, { fields: next })} />

        <Field label={isAudio ? "音乐描述 / 参考" : d.kind === "text" ? "脚本 / 提示词" : "生成提示词 (Prompt)"}>
          <textarea
            className="textarea"
            value={d.payload.prompt ?? ""}
            placeholder={isAudio ? "描述想要的配乐情绪、节奏、乐器…" : "描述你想要的画面或内容"}
            onChange={(e) => updateNodePayload(node.id, { prompt: e.target.value })}
          />
        </Field>

        {isVisual && d.kind !== "asset" && (
          <Field label="反向提示词 (Negative)">
            <input className="input" value={d.payload.negativePrompt ?? ""} onChange={(e) => updateNodePayload(node.id, { negativePrompt: e.target.value })} />
          </Field>
        )}

        {/* —— 接口 (Provider) + 大模型 (Model) 全量暴露 —— */}
        <Field label="接口 (Provider)">
          <select
            className="select"
            value={d.payload.provider ?? ""}
            onChange={(e) => {
              // 切换接口时清空已选模型，避免模型来自不同供应商
              updateNodePayload(node.id, { provider: e.target.value || undefined, model: undefined });
            }}
          >
            <option value="">（跟随默认）</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.kind === "demo" ? "" : p.enabled ? "" : " · 未启用"}
              </option>
            ))}
          </select>
        </Field>

        <Field label="大模型 (Model)">
          <select
            className="select"
            value={d.payload.model ?? ""}
            onChange={(e) => updateNodePayload(node.id, { model: e.target.value || undefined })}
          >
            <option value="">（跟随默认）</option>
            {chosenProv ? (
              // 已选具体接口：列出该接口的全部模型
              chosenProv.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))
            ) : (
              // 未指定接口：按供应商分组列出所有模型，全部可点选
              providers.map((p) => (
                <optgroup key={p.id} label={p.name}>
                  {p.models.map((m) => (
                    <option key={p.id + "::" + m} value={m}>{m}</option>
                  ))}
                </optgroup>
              ))
            )}
          </select>
        </Field>

        {/* 接口状态提示：地址 + 密钥 */}
        <div className="inspector__prov-hint">
          <span className="dot" data-ok={chosenProv ? chosenProv.kind === "demo" || !!chosenProv.apiKey : false} />
          {chosenProv ? (
            chosenProv.kind === "demo" ? (
              <span>离线 Demo 引擎 · 无需密钥</span>
            ) : chosenProv.apiKey ? (
              <span>已配置密钥 · {chosenProv.baseUrl || "默认端点"}</span>
            ) : (
              <span>未配置密钥 · {chosenProv.baseUrl || "默认端点"}（将回退 Demo）</span>
            )
          ) : (
            <span>未指定接口 · 将按运行模式/默认供应商选择</span>
          )}
        </div>

        {isVisual && d.kind !== "asset" && (
          <Field label="尺寸">
            <select className="select" value={(d.payload.params?.size as string) ?? "1024x1024"} onChange={(e) => updateNodePayload(node.id, { params: { ...d.payload.params, size: e.target.value } })}>
              <option value="1024x1024">1024 × 1024（方）</option>
              <option value="1344x768">1344 × 768（横）</option>
              <option value="768x1344">768 × 1344（竖）</option>
            </select>
          </Field>
        )}

        {/* 生成操作 */}
        <div style={{ display: "flex", gap: 8, margin: "6px 0 18px" }}>
          {d.kind === "asset" ? (
            <Button variant="primary" size="sm" block icon={<IconLink2 size={14} />} onClick={() => assetToGenerator(node.id)}>
              派生下游生成器
            </Button>
          ) : (
            <>
              {isVisual && (
                <Button variant="primary" size="sm" block icon={<IconImage size={14} />} disabled={busyThis} onClick={() => gen("image", d.payload.model)}>
                  {busyThis ? <Spinner size={13} /> : "出图"}
                </Button>
              )}
              {isVisual && (
                <Button variant="ghost" size="sm" block icon={<IconVideo size={14} />} disabled={busyThis} onClick={() => gen("video", d.payload.model)}>
                  出视频
                </Button>
              )}
              {!isAudio && (
                <Button variant="ghost" size="sm" block icon={<IconText size={14} />} disabled={busyThis} onClick={() => gen("text", d.payload.model)}>
                  出文
                </Button>
              )}
              {isAudio && (
                <Button variant="primary" size="sm" block icon={<IconSpark size={14} />} disabled={busyThis} onClick={() => gen("text", d.payload.model)}>
                  {busyThis ? <Spinner size={13} /> : "生成配乐描述"}
                </Button>
              )}
            </>
          )}
        </div>

        {/* 上游上下文面板（连通性可见化） */}
        <UpstreamContext nodeId={node.id} />

        {/* 结果画廊 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div className="eyebrow">生成结果 ({d.payload.results?.length ?? 0})</div>
          {d.payload.results && d.payload.results.length > 0 && d.kind !== "asset" && (
            <button className="eyebrow-btn" title="把最新结果落为可复用素材节点" onClick={() => resultToAssetNode(node.id)}>
              <IconLink2 size={12} /> 结果 → 素材
            </button>
          )}
        </div>
        {!d.payload.results || d.payload.results.length === 0 ? (
          <div className="faint" style={{ fontSize: 12 }}>还没有结果。点击上方按钮生成。</div>
        ) : (
          <div className="result-grid">
            {d.payload.results.map((r) => (
              <div key={r.id} className="result-card">
                <div className="result-card__bar">
                  {r.url && (
                    <IconButton title="收藏到资产" onClick={() => collect(r.url)} style={{ background: "rgba(10,10,14,0.7)" }}>
                      <IconPlus size={13} />
                    </IconButton>
                  )}
                  {r.text && (
                    <IconButton title="收藏到资产" onClick={() => collect(undefined, r.text)} style={{ background: "rgba(10,10,14,0.7)" }}>
                      <IconPlus size={13} />
                    </IconButton>
                  )}
                </div>
                {r.url && (r.kind === "video" ? (
                  <video src={r.url} controls loop muted playsInline style={{ width: "100%", display: "block" }} />
                ) : (
                  <img src={r.url} alt="" />
                ))}
                {r.text && <div className="result-card__txt">{r.text}</div>}
                {r.error && <div className="result-card__txt" style={{ color: "var(--signal)" }}>{r.error}</div>}
              </div>
            ))}
          </div>
        )}

        {d.payload.note && d.kind === "text" && (
          <Field label="备注">
            <textarea className="textarea" value={d.payload.note} onChange={(e) => updateNodePayload(node.id, { note: e.target.value })} />
          </Field>
        )}
      </div>
    </div>
  );
}
