// ============================================================
// AIMAMAX Studio — 语义节点卡片（角色 / 场景 / 分镜 / 素材 / 文本 / 音乐 / 生成）
// ============================================================
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { StudioNodeData, NodeKind } from "../lib/types";
import { useStudio } from "../lib/store";
import {
  IconCharacter, IconScene, IconText, IconMusic, IconImage, IconSpark, IconPlay,
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
  const { busyNodeId, generateFromNode, selectNode } = useStudio();
  const Icon = KIND_ICON[d.kind] ?? IconText;
  const busy = busyNodeId === id;
  const latest = d.payload.results?.slice(-1)[0];
  const preview = latest?.url;
  const previewTxt = d.kind === "text" ? d.payload.results?.find((r) => r.text)?.text : undefined;

  return (
    <div className="snode" data-selected={selected} data-kind={d.kind} onDoubleClick={() => selectNode(id)}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="snode__head">
        <span className="snode__kind"><Icon size={16} /></span>
        <span className="snode__label truncate">{d.label}</span>
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
        <span>{d.payload.results?.length ?? 0} 结果</span>
        {d.kind !== "text" && d.kind !== "music" && (
          <button className="snode__gen" onClick={(e) => { e.stopPropagation(); generateFromNode(id, "image"); }}>
            <IconPlay size={12} /> 出图
          </button>
        )}
        {d.kind === "text" && (
          <button className="snode__gen" onClick={(e) => { e.stopPropagation(); generateFromNode(id, "text"); }}>
            <IconSpark size={12} /> 出文
          </button>
        )}
      </div>
    </div>
  );
}

export const StudioNode = memo(StudioNodeImpl);
