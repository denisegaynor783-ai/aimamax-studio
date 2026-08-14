// ============================================================
// AIMAMAX Studio — 创作页（导演台画布 + 检视器）
// ============================================================
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { useStudio } from "../lib/store";
import { DirectorCanvas } from "../canvas/DirectorCanvas";
import { Inspector } from "../canvas/Inspector";
import { Button, EmptyState } from "../components/ui";
import { NewProjectModal } from "../components/NewProjectModal";
import { IconCreate, IconProjects, IconFilm } from "../components/icons";
import { useState } from "react";

export default function Studio() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { project, openProject, selectedNodeId } = useStudio();
  const [showNew, setShowNew] = useState(false);

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
          hint="导演台需要依附一个项目。新建一个，或从「我的项目」打开，即可进入无限画布。"
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
      <div className="studio-layout">
        <DirectorCanvas />
        <aside className="studio-inspector" data-open={!!selectedNodeId}>
          <Inspector />
        </aside>
      </div>
    </ReactFlowProvider>
  );
}
