// ============================================================
// AIMAMAX Studio — 创作页（双模式：画布 / 3D 导演台 + 检视器）
// ============================================================
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { useStudio } from "../lib/store";
import { DirectorCanvas } from "../canvas/DirectorCanvas";
import { DirectorStage3D } from "../canvas/DirectorStage3D";
import { Inspector } from "../canvas/Inspector";
import { Button, EmptyState } from "../components/ui";
import { NewProjectModal } from "../components/NewProjectModal";
import { IconCreate, IconProjects, IconFilm, IconCube } from "../components/icons";

export default function Studio() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { project, openProject, selectedNodeId } = useStudio();
  const [showNew, setShowNew] = useState(false);
  const [mode, setMode] = useState<"canvas" | "stage">("canvas");

  const pid = params.get("p");
  useEffect(() => {
    if (pid && pid !== project?.id) {
      openProject(pid);
    }
  }, [pid, project?.id, openProject]);

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
          <aside className="studio-inspector" data-open={mode === "canvas" && !!selectedNodeId}>
            <Inspector />
          </aside>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
