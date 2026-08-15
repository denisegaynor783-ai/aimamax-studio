// ============================================================
// AIMAMAX Studio — 语义节点卡片（角色 / 场景 / 分镜 / 素材 / 文本 / 音乐 / 生成）
// 多维增强：状态点(草稿/进行中/完成) · 类型色彩条 · 悬停操作条(复制/删除)
// D1 升级：脚本/剧本节点 → 富信息卡片（标题+元数据+标签+内容预览，对标参考截图）
// ============================================================
import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StudioNodeData, NodeKind } from "../lib/types";
import { useStudio } from "../lib/store";
import { KIND_FIELDS } from "../lib/graph";
import {
  IconCharacter, IconScene, IconText, IconMusic, IconImage, IconSpark, IconPlay, IconDuplicate, IconTrash,
  IconChevronDown, IconChevronUp, IconVideo, IconLayers, IconLink2,
} from "../components/icons";

const KIND_ICON: Record<NodeKind, (p: { size?: number }) => JSX.Element> = {
  character: IconCharacter,
  scene: IconScene,
  shot: IconImage,
  asset: IconImage,
  prompt: IconSpark,
  music: IconMusic,
  text: IconText,
  script: IconText,
  generator: IconSpark,
  group: IconLayers,
};

const KIND_COLOR: Record<string, string> = {
  character: "#ff6b1a", scene: "#4cc2ff", shot: "#ffc24b", asset: "#b98bff",
  prompt: "#ff6b1a", music: "#3ddc84", text: "#9aa0b5", script: "#e056fd", generator: "#ff6b1a", group: "#ffc24b",
};

/* ── 剧本富信息卡片（D1：对标参考截图左侧节点） ── */
function ScriptRichCard({ d, id, selected }: { d: StudioNodeData; id: string; selected: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const { generateFromNode } = useStudio();
  const p = d.payload;
  const title = d.label || "未命名剧本";
  const genre = p.genre || "";
  const duration = p.duration || "";
  const mood = p.mood || "";
  const tags = p.tags || [];
  const content = p.prompt || p.note || "";

  return (
    <div className="snode snode--rich" data-selected={selected} data-kind="script">
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {/* 悬停操作条 */}
      <div className="snode__actions">
        <button title="复制节点" onClick={(e) => { e.stopPropagation(); useStudio.getState().duplicateNode(id); }}><IconDuplicate size={13} /></button>
        <button title="删除节点" onClick={(e) => { e.stopPropagation(); useStudio.getState().deleteNode(id); }}><IconTrash size={13} /></button>
      </div>

      {/* 头部：类型 badge + 标题 */}
      <div className="snode-rich__head">
        <span className="snode-rich__badge">剧本</span>
        <span className="snode-rich__title">{title}</span>
      </div>

      {/* 元数据行 */}
      <div className="snode-rich__meta">
        {genre && <div className="snode-rich__meta-row"><span className="snode-rich__meta-label">类型</span><span>{genre}</span></div>}
        {duration && <div className="snode-rich__meta-row"><span className="snode-rich__meta-label">时长建议</span><span>{duration}</span></div>}
        {mood && <div className="snode-rich__meta-row"><span className="snode-rich__meta-label">基调</span><span>{mood}</span></div>}
      </div>

      {/* 标签组 */}
      {tags.length > 0 && (
        <div className="snode-rich__tags">
          {tags.map((t, i) => (
            <span key={i} className="snode-rich__tag">[{t}]</span>
          ))}
        </div>
      )}

      {/* 内容预览区（可折叠） */}
      {content && (
        <div className="snode-rich__body">
          <button
            className="snode-rich__toggle"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          >
            {expanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
            <span>内容{expanded ? "收起" : "展开"}</span>
          </button>
          {expanded && (
            <div className="snode-rich__content">
              {content.slice(0, 300)}{content.length > 300 ? "…" : ""}
            </div>
          )}
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="snode-rich__foot">
        <button
          className="snode__gen"
          onClick={(e) => { e.stopPropagation(); generateFromNode(id, "image"); }}
        >
          <IconImage size={12} /> 出图
        </button>
        <button
          className="snode__gen"
          style={{ color: "var(--info)" }}
          onClick={(e) => { e.stopPropagation(); generateFromNode(id, "text"); }}
        >
          <IconSpark size={12} /> 出文
        </button>
        <button
          className="snode__gen"
          style={{ color: "var(--ok)" }}
          onClick={(e) => { e.stopPropagation(); useStudio.getState().storyboardFromText(id); }}
        >
          <IconPlay size={12} /> 智能分镜
        </button>
      </div>
    </div>
  );
}

/* ── 生成器节点卡片（处理器形态：消费上游内容 → 产出图/视频/剧本） ── */
function GeneratorCard({ d, id, selected }: { d: StudioNodeData; id: string; selected: boolean }) {
  const { busyNodeId, generateFromNode, duplicateNode, deleteNode, updateNodePayload, resultToAssetNode, nodes, edges } = useStudio();
  const p = d.payload;
  const gtype = p.generatorType || "image";
  const busy = busyNodeId === id;
  const results = p.results ?? [];
  const latest = results.slice(-1)[0];
  const preview = latest?.url;
  const previewTxt = latest?.text;
  const upId = edges.find((e) => e.target === id)?.source;
  const upstream = upId ? nodes.find((n) => n.id === upId) : undefined;

  const status: "busy" | "done" | "draft" = busy
    ? "busy"
    : results.some((r) => r.status === "success")
    ? "done"
    : "draft";

  const genLabel = gtype === "image" ? "出图" : gtype === "video" ? "出视频" : "出剧本";

  return (
    <div className="snode snode--gen" data-selected={selected} data-kind="generator" data-status={status}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="snode__actions">
        <button title="复制节点" onClick={(e) => { e.stopPropagation(); duplicateNode(id); }}><IconDuplicate size={13} /></button>
        <button title="删除节点" onClick={(e) => { e.stopPropagation(); deleteNode(id); }}><IconTrash size={13} /></button>
      </div>

      <div className="snode-gen__head">
        <span className="snode-rich__badge">生成器</span>
        <span className="snode__label truncate">{d.label}</span>
        <span className="snode__status" data-status={status} title={status === "busy" ? "进行中" : status === "done" ? "已完成" : "草稿"} />
      </div>

      {/* 生成类型切换：剧本 / 图片 / 视频 */}
      <div className="snode-gen__types" onClick={(e) => e.stopPropagation()}>
        {(["script", "image", "video"] as const).map((t) => (
          <button key={t} data-active={gtype === t} onClick={() => updateNodePayload(id, { generatorType: t })}>
            {t === "script" ? <IconText size={13} /> : t === "image" ? <IconImage size={13} /> : <IconVideo size={13} />}
            {t === "script" ? "剧本" : t === "image" ? "图片" : "视频"}
          </button>
        ))}
      </div>

      {/* 输入来源（上游节点） */}
      <div className="snode-gen__src">
        {upstream ? (
          <span title={upstream.data.label}>输入 ▸ {upstream.data.label}</span>
        ) : (
          <span className="faint">无上游 · 用下方提示词</span>
        )}
      </div>

      {/* 提示词 / 模板 */}
      <div className="snode-gen__prompt" onClick={(e) => e.stopPropagation()}>
        <textarea
          className="textarea snode-gen__ta"
          value={p.prompt ?? ""}
          placeholder="生成提示词 / 模板（可留空，仅用上游内容）"
          onChange={(e) => updateNodePayload(id, { prompt: e.target.value })}
        />
      </div>

      {/* 生成按钮 */}
      <button className="snode-gen__run" disabled={busy} onClick={(e) => { e.stopPropagation(); generateFromNode(id, gtype === "script" ? "text" : gtype); }}>
        {busy ? <span className="spin"><IconSpark size={13} /></span> : <IconPlay size={13} />}
        {busy ? "生成中…" : genLabel}
      </button>

      {/* 进度条（生成中） */}
      {busy && (
        <div className="snode-gen__progress">
          <div className="snode-gen__bar" />
        </div>
      )}

      {/* 结果预览 */}
      {preview && (
        <div className="snode__thumb" style={{ marginTop: 8 }}><img src={preview} alt="" /></div>
      )}
      {!preview && previewTxt && (
        <div className="snode__thumb" style={{ aspectRatio: "auto" }}>
          <span style={{ fontSize: 11, color: "var(--text-faint)", padding: 10 }}>{previewTxt.slice(0, 60)}…</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="snode-gen__foot">
          <span>{results.length} 结果</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="snode__gen" style={{ color: "var(--info)" }} title="把结果落为可复用素材节点（reference 连线）" onClick={(e) => { e.stopPropagation(); resultToAssetNode(id); }}>
              <IconLink2 size={12} /> 结果 → 素材
            </button>
            <button className="snode__gen" onClick={(e) => { e.stopPropagation(); generateFromNode(id, gtype === "script" ? "text" : gtype); }}>
              <IconSpark size={12} /> 再次生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 全节点类型卡片（KindCard）：按类型渲染结构化字段 + 类型正确动作 ── */
function KindCard({ id, d, selected }: { id: string; d: StudioNodeData; selected: boolean }) {
  const { busyNodeId, generateFromNode, selectNode, duplicateNode, deleteNode, storyboardFromText, assetToGenerator } = useStudio();
  const Icon = KIND_ICON[d.kind] ?? IconText;
  const p = d.payload;
  const busy = busyNodeId === id;
  const results = p.results ?? [];
  const latest = results.slice(-1)[0];
  const preview = latest?.url;
  const previewTxt = d.kind === "text" ? results.find((r) => r.text)?.text : undefined;

  const status: "busy" | "done" | "draft" = busy
    ? "busy"
    : results.some((r) => r.status === "success")
    ? "done"
    : "draft";

  // 结构化字段摘要（角色/场景/分镜/音乐）
  const fields = p.fields ?? {};
  const fieldSpec = KIND_FIELDS[d.kind] ?? [];
  const chips = fieldSpec.map((f) => fields[f.key]).filter(Boolean).slice(0, 4);

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div className="snode" data-selected={selected} data-kind={d.kind} data-status={status} onDoubleClick={() => selectNode(id)}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="snode__actions">
        <button title="复制节点" onClick={(e) => { stop(e); duplicateNode(id); }}><IconDuplicate size={13} /></button>
        <button title="删除节点" onClick={(e) => { stop(e); deleteNode(id); }}><IconTrash size={13} /></button>
      </div>

      <div className="snode__head">
        <span className="snode__kind" style={{ color: KIND_COLOR[d.kind] }}><Icon size={16} /></span>
        <span className="snode__label truncate">{d.label}</span>
        <span className="snode__status" data-status={status} title={status === "busy" ? "进行中" : status === "done" ? "已完成" : "草稿"} />
        {busy && <span style={{ color: "var(--film)" }}><IconSpark size={15} className="spin" /></span>}
      </div>

      {/* 结构化字段条 */}
      {chips.length > 0 && (
        <div className="kindcard__fields">
          {chips.map((v, i) => (
            <span key={i} className="kindcard__chip" title={String(v)}>{String(v)}</span>
          ))}
        </div>
      )}

      <div className="snode__body">
        <div className="snode__note truncate">{p.prompt || p.note || "（未填写内容）"}</div>
        {preview && <div className="snode__thumb"><img src={preview} alt="" /></div>}
        {!preview && previewTxt && (
          <div className="snode__thumb" style={{ aspectRatio: "auto" }}>
            <span style={{ fontSize: 11, color: "var(--text-faint)", padding: 10 }}>{previewTxt.slice(0, 60)}…</span>
          </div>
        )}
      </div>

      {/* 类型正确动作 */}
      <div className="kindcard__foot">
        {d.kind === "character" && (
          <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "image"); }}><IconImage size={12} /> 出角色图</button>
        )}
        {d.kind === "scene" && (
          <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "image"); }}><IconImage size={12} /> 出场景图</button>
        )}
        {d.kind === "shot" && (
          <>
            <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "image"); }}><IconImage size={12} /> 出图</button>
            <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "video"); }}><IconVideo size={12} /> 出视频</button>
          </>
        )}
        {d.kind === "music" && (
          <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "text"); }}><IconSpark size={12} /> 出配乐描述</button>
        )}
        {d.kind === "asset" && (
          <button className="snode__gen" style={{ color: "var(--info)" }} onClick={(e) => { stop(e); assetToGenerator(id); }}><IconLink2 size={12} /> 转生成器</button>
        )}
        {d.kind === "prompt" && (
          <>
            <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "image"); }}><IconImage size={12} /> 出图</button>
            <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "video"); }}><IconVideo size={12} /> 出视频</button>
            <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "text"); }}><IconText size={12} /> 出文</button>
          </>
        )}
        {d.kind === "text" && (
          <button className="snode__gen" onClick={(e) => { stop(e); generateFromNode(id, "text"); }}><IconSpark size={12} /> 出文</button>
        )}
      </div>

      {d.kind === "text" && (
        <button className="snode__story" onClick={(e) => { stop(e); storyboardFromText(id); }} title="按换行把脚本拆成时序分镜节点（不消耗额度）">
          <IconSpark size={12} /> 智能分镜
        </button>
      )}
    </div>
  );
}

/* ── 标准节点卡片（分发：生成器 / 剧本 → 专属卡片，其余 → KindCard） ── */
function StudioNodeImpl({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData;
  // 生成器节点 → 处理器形态卡片
  if (d.kind === "generator") return <GeneratorCard d={d} id={id} selected={selected} />;
  // 剧本 → 富信息卡片
  if (d.kind === "script") return <ScriptRichCard d={d} id={id} selected={selected} />;
  // 其余 7 种 → 按类型渲染结构化字段 + 类型正确动作
  return <KindCard id={id} d={d} selected={selected} />;
}

export const StudioNode = memo(StudioNodeImpl);
