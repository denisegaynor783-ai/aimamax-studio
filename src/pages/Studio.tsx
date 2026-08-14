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
import { Button, EmptyState } from "../components/ui";
import { NewProjectModal } from "../components/NewProjectModal";
import { IconCreate, IconProjects, IconFilm, IconCube, IconChevron } from "../components/icons";

// 检视器宽度约束（紧凑默认值，可手动收缩/拉伸）
const INSPECTOR_MIN = 248;
const INSPECTOR_MAX = 520;
const INSPECTOR_DEFAULT = 300;

export default function Studio() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { project, openProject, selectedNodeId } = useStudio();
  const [showNew, setShowNew] = useState(false);
  const [mode, setMode] = useState<"canvas" | "stage">("canvas");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [inspectorW, setInspectorW] = useState(INSPECTOR_DEFAULT);
  const [resizing, setResizing] = useState(false);

  const pid = params.get("p");
  useEffect(() => {
    if (pid && pid !== project?.id) {
      openProject(pid);
    }
  }, [pid, project?.id, openProject]);

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
      <div id="studio-layout" className="studio-layout" data-mode={mode}>
        <div className="studio-modebar">
          <div className="seg">
            <button data-active={mode === "canvas"} onClick={() => setMode("canvas")}>
              <IconFilm size={14} /> 画布
            </button>
            <button data-active={mode === "stage"} onClick={() => setMode("stage")}>
              <IconCube size={14} /> 3D 导演台
            </button>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>{project.name}</span>
        </div>
        <div className="studio-body">
          {mode === "canvas" ? <DirectorCanvas /> : <DirectorStage3D />}

          {mode === "canvas" && (
            <aside
              className="studio-inspector"
              data-open={!!selectedNodeId}
              data-collapsed={inspectorCollapsed}
              data-resizing={resizing}
              style={{ width: inspectorCollapsed ? 0 : inspectorW }}
            >
              <div className="inspector-resize" onMouseDown={startResize} title="拖动调整检视器宽度" />
              <Inspector onCollapse={() => setInspectorCollapsed(true)} />
            </aside>
          )}

          {mode === "canvas" && inspectorCollapsed && (
            <button
              className="inspector-reopen"
              onClick={() => setInspectorCollapsed(false)}
              title="展开检视器"
              aria-label="展开检视器"
            >
              <IconChevron size={16} />
            </button>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
