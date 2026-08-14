// ============================================================
// AIMAMAX Studio — 语义节点卡片（角色 / 场景 / 分镜 / 素材 / 文本 / 音乐 / 生成）
// 多维增强：状态点(草稿/进行中/完成) · 类型色彩条 · 悬停操作条(复制/删除) · 文本节点「智能分镜」
// ============================================================
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StudioNodeData, NodeKind } from "../lib/types";
import { useStudio } from "../lib/store";
import {
  IconCharacter, IconScene, IconText, IconMusic, IconImage, IconSpark, IconPlay, IconDuplicate, IconTrash,
} from "../components/icons";

const KIND_ICON: Record<NodeKind, (p: { size?: number }) => JSX.Element> = {
  character: IconCharacter,
  scene: IconScene,
  shot: IconImage,
  asset: IconImage,
  prompt: IconSpark,
  music: IconMusic,
  text: IconText,
};

function StudioNodeImpl({ id, data, selected }: NodeProps) {
  const d = data as StudioNodeData;
  const { busyNodeId, generateFromNode, selectNode, duplicateNode, deleteNode, storyboardFromText } = useStudio();
  const Icon = KIND_ICON[d.kind] ?? IconText;
  const busy = busyNodeId === id;
  const results = d.payload.results ?? [];
  const latest = results.slice(-1)[0];
  const preview = latest?.url;
  const previewTxt = d.kind === "text" ? results.find((r) => r.text)?.text : undefined;

  // 状态点：进行中 / 完成(有成功结果) / 草稿
  const status: "busy" | "done" | "draft" = busy
    ? "busy"
    : results.some((r) => r.status === "success")
    ? "done"
    : "draft";

  return (
    <div className="snode" data-selected={selected} data-kind={d.kind} data-status={status} onDoubleClick={() => selectNode(id)}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {/* 悬停操作条 */}
      <div className="snode__actions">
        <button title="复制节点" onClick={(e) => { e.stopPropagation(); duplicateNode(id); }}><IconDuplicate size={13} /></button>
        <button title="删除节点" onClick={(e) => { e.stopPropagation(); deleteNode(id); }}><IconTrash size={13} /></button>
      </div>

      <div className="snode__head">
        <span className="snode__kind"><Icon size={16} /></span>
        <span className="snode__label truncate">{d.label}</span>
        <span className="snode__status" data-status={status} title={status === "busy" ? "进行中" : status === "done" ? "已完成" : "草稿"} />
        {busy && <span style={{ color: "var(--film)" }}><IconSpark size={15} className="spin" /></span>}
      </div>

      <div className="snode__body">
        <div className="snode__note truncate">
          {d.payload.prompt || d.payload.note || "（未填写内容）"}
        </div>
        {preview && (
          <div className="snode__thumb"><img src={preview} alt="" /></div>
        )}
        {!preview && previewTxt && (
          <div className="snode__thumb" style={{ aspectRatio: "auto" }}>
            <span style={{ fontSize: 11, color: "var(--text-faint)", padding: 10 }}>{previewTxt.slice(0, 60)}…</span>
          </div>
        )}
      </div>

      <div className="snode__foot">
        <span>{results.length} 结果</span>
        {d.kind === "text" ? (
          <button className="snode__gen" onClick={(e) => { e.stopPropagation(); generateFromNode(id, "text"); }}>
            <IconSpark size={12} /> 出文
          </button>
        ) : d.kind !== "music" ? (
          <button className="snode__gen" onClick={(e) => { e.stopPropagation(); generateFromNode(id, "image"); }}>
            <IconPlay size={12} /> 出图
          </button>
        ) : (
          <button className="snode__gen" onClick={(e) => { e.stopPropagation(); generateFromNode(id, "text"); }}>
            <IconSpark size={12} /> 配乐
          </button>
        )}
      </div>

      {/* 文本节点：离线智能分镜 */}
      {d.kind === "text" && (
        <button
          className="snode__story"
          onClick={(e) => { e.stopPropagation(); storyboardFromText(id); }}
          title="按换行把脚本拆成时序分镜节点（不消耗额度）"
        >
          <IconSpark size={12} /> 智能分镜
        </button>
      )}
    </div>
  );
}

export const StudioNode = memo(StudioNodeImpl);
