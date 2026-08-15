// ============================================================
// AIMAMAX Studio — 创作页（双模式：画布 / 3D 导演台 + 检视器）
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { useStudio } from "../lib/store";
import { DirectorCanvas } from "../canvas/DirectorCanvas";
import { DirectorStage3D } from "../canvas/DirectorStage3D";
import { Inspector } from "../canvas/Inspector";
import { NodeActionMenu } from "../canvas/NodeActionMenu";
import { Button, EmptyState } from "../components/ui";
import { NewProjectModal } from "../components/NewProjectModal";
import { IconCreate, IconProjects, IconFilm, IconCube, IconChevron } from "../components/icons";

// 检视器宽度约束（紧凑默认值，可手动收缩/拉伸）
const INSPECTOR_MIN = 224;
const INSPECTOR_MAX = 520;
const INSPECTOR_DEFAULT = 264;

export default function Studio() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { project, openProject, selectedNodeId, nodes, studioMode, setStudioMode } = useStudio();
  const [showNew, setShowNew] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [inspectorW, setInspectorW] = useState(INSPECTOR_DEFAULT);
  const [resizing, setResizing] = useState(false);

  const pid = params.get("p");
  useEffect(() => {
    if (pid && pid !== project?.id) {
      openProject(pid);
    }
  }, [pid, project?.id, openProject]);

  // —— 浮动菜单：检视器隐藏时，根据选中节点位置渲染 ——
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : undefined;
  const floatingMenu = studioMode === "canvas" && inspectorCollapsed && selectedNode && selectedNodeId
    ? <NodeActionMenu nodeId={selectedNodeId} position={selectedNode.position} />
    : null;
  const canvasArea = studioMode === "canvas" ? <DirectorCanvas /> : <DirectorStage3D />;

  // —— 检视器拖拽改宽（左侧手柄）——
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const onMove = (ev: MouseEvent) => {
      const w = Math.min(INSPECTOR_MAX, Math.max(INSPECTOR_MIN, window.innerWidth - ev.clientX));
      setInspectorW(w);
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // —— 全局快捷键：撤销/重做 · 复制/粘贴/剪切 ——
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      const s = useStudio.getState();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); s.undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); s.redo(); }
      else if (k === "c") { e.preventDefault(); s.copySelection(); }
      else if (k === "v") { e.preventDefault(); s.pasteClipboard(); }
      else if (k === "x") { e.preventDefault(); s.copySelection(); s.deleteSelected(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!project) {
    return (
      <div className="content" style={{ display: "grid", placeItems: "center", height: "100%" }}>
        <EmptyState
          icon={<IconFilm size={30} />}
          title="还没有打开项目"
          hint="导演台需要依附一个项目。新建一个，或从「我的项目」打开，即可进入无限画布与 3D 导演台。"
          action={
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="primary" icon={<IconCreate size={16} />} onClick={() => setShowNew(true)}>新建项目</Button>
              <Button variant="ghost" icon={<IconProjects size={16} />} onClick={() => nav("/projects")}>我的项目</Button>
            </div>
          }
        />
        {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div id="studio-layout" className="studio-layout" data-mode={studioMode}>
        <div className="studio-modebar">
          <div className="seg">
            <button data-active={studioMode === "canvas"} onClick={() => setStudioMode("canvas")}>
              <IconFilm size={14} /> 画布
            </button>
            <button data-active={studioMode === "stage"} onClick={() => setStudioMode("stage")}>
              <IconCube size={14} /> 3D 导演台
            </button>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{project.name}</span>
        </div>
        <div className="studio-body">
          {canvasArea}

          {/* 检视器：未隐藏时显示右侧面板 */}
          {studioMode === "canvas" && !inspectorCollapsed && (
            <aside
              className="studio-inspector"
              data-open={!!selectedNodeId}
              data-resizing={resizing}
              style={{ width: inspectorW }}
            >
              <div className="inspector-resize" onMouseDown={startResize} title="拖动调整检视器宽度" />
              <Inspector onCollapse={() => setInspectorCollapsed(true)} />
            </aside>
          )}

          {/* 检视器隐藏时：浮动功能菜单吸附于选中节点旁 */}
          {floatingMenu}

          {/* 检视器收起后：右侧边缘悬浮恢复按钮 */}
          {studioMode === "canvas" && inspectorCollapsed && (
            <button
              className="inspector-reopen"
              onClick={() => setInspectorCollapsed(false)}
              title="展开检视器面板"
            >
              <IconChevron size={14} /> 检视器
            </button>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
