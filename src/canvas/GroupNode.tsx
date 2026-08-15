// ============================================================
// AIMAMAX Studio — 分组节点（视觉包围盒，可折叠成员）
// ============================================================
import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useStudio } from "../lib/store";
import { IconChevronDown, IconChevronUp, IconLayers } from "../components/icons";
import type { StudioNodeData } from "../lib/types";

function GroupNodeImpl({ id, data, selected }: NodeProps) {
  const { toggleGroup, ungroupNodes } = useStudio();
  const d = data as unknown as StudioNodeData;
  const collapsed = !!d.payload?.collapsed;
  const count = d.payload?.count ?? 0;
  const dim = d.payload?.dimensions ?? { w: 240, h: 160 };

  return (
    <div className="gnode" data-selected={selected} data-collapsed={collapsed} style={{ width: dim.w, height: dim.h }}>
      <div className="gnode__bar">
        <span className="gnode__title"><IconLayers size={14} /> {d.label}</span>
        <span className="gnode__count">{count} 节点</span>
        <button
          title={collapsed ? "展开分组" : "折叠分组"}
          onClick={(e) => { e.stopPropagation(); toggleGroup(id); }}
        >
          {collapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
        </button>
        <button title="解组" onClick={(e) => { e.stopPropagation(); ungroupNodes(id); }}>
          解组
        </button>
      </div>
      {collapsed && <div className="gnode__hint">已折叠 · 点击上方展开</div>}
    </div>
  );
}

export const GroupNode = memo(GroupNodeImpl);
