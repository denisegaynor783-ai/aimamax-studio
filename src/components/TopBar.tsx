// ============================================================
// AIMAMAX Studio — 顶栏（路由感知 + 创作态上下文操作）
// ============================================================
import { useLocation, useNavigate } from "react-router-dom";
import { useStudio } from "../lib/store";
import { Button, Badge, IconButton, Spinner } from "./ui";
import { IconSave, IconExport, IconProjects, IconFilm, IconSpark } from "./icons";

const TITLES: Record<string, string> = {
  "/": "发现",
  "/studio": "创作",
  "/agents": "Agent 中心",
  "/characters": "角色库",
  "/assets": "资产库",
  "/projects": "我的项目",
  "/settings": "设置",
};

export function TopBar() {
  const loc = useLocation();
  const nav = useNavigate();
  const { project, busy, saveCurrent, settings } = useStudio();
  const key = loc.pathname === "/" ? "/" : "/" + loc.pathname.split("/")[1];
  const title = TITLES[key] ?? "AIMAMAX";

  const inStudio = loc.pathname.startsWith("/studio");

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <IconFilm size={20} />
        <span className="topbar__title">{title}</span>
        {inStudio && project && (
          <>
            <span className="topbar__crumb">/</span>
            <span style={{ fontWeight: 600 }}>{project.name}</span>
            <Badge tone="film">{project.kind}</Badge>
          </>
        )}
      </div>

      <div className="topbar__spacer" />

      <Button variant="ghost" size="sm" icon={<IconSpark size={15} />} onClick={() => nav("/login")}>
        登入
      </Button>

      {settings.demoMode && <Badge tone="signal">DEMO 模式</Badge>}

      {inStudio && project && (
        <>
          <IconButton onClick={() => nav("/projects")} title="返回项目列表">
            <IconProjects size={18} />
          </IconButton>
          <Button variant="ghost" size="sm" icon={<IconSave size={15} />} onClick={() => saveCurrent()}>
            保存
          </Button>
          <Button variant="primary" size="sm" icon={<IconExport size={15} />} onClick={() => nav("/settings?tab=export")}>
            导出
          </Button>
        </>
      )}

      {busy && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--film)" }}>
          <Spinner size={14} /> 生成中
        </span>
      )}
    </header>
  );
}
