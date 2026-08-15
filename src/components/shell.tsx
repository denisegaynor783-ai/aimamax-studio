// ============================================================
// AIMAMAX Studio — 导航外壳（rail + 移动底栏）
// ============================================================
import { NavLink, useLocation } from "react-router-dom";
import {
  IconDiscover,
  IconCreate,
  IconAssets,
  IconProjects,
  IconSettings,
  IconFilm,
  IconSpark,
  IconCharacter,
} from "./icons";

interface NavDef {
  to: string;
  label: string;
  icon: (p: { size?: number }) => JSX.Element;
}
const NAV: NavDef[] = [
  { to: "/", label: "发现", icon: IconDiscover },
  { to: "/studio", label: "创作", icon: IconCreate },
  { to: "/agents", label: "Agent", icon: IconSpark },
  { to: "/characters", label: "角色库", icon: IconCharacter },
  { to: "/assets", label: "资产", icon: IconAssets },
  { to: "/projects", label: "项目", icon: IconProjects },
  { to: "/settings", label: "设置", icon: IconSettings },
];

export function Rail() {
  const loc = useLocation();
  const isActive = (to: string) => (to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to));
  return (
    <nav className="rail">
      <div className="rail__brand" title="AIMAMAX Studio">
        <IconFilm size={24} />
      </div>
      {NAV.map((n) => {
        const Icon = n.icon;
        return (
          <NavLink key={n.to} to={n.to} className="rail__item" data-active={isActive(n.to)}>
            <Icon size={22} />
            <span className="rail__label">{n.label}</span>
          </NavLink>
        );
      })}
      <div className="rail__spacer" />
    </nav>
  );
}

export function MobileNav() {
  const loc = useLocation();
  const isActive = (to: string) => (to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(to));
  return (
    <nav className="mobilenav">
      {NAV.map((n) => {
        const Icon = n.icon;
        return (
          <NavLink key={n.to} to={n.to} className="mobilenav__item" data-active={isActive(n.to)}>
            <Icon size={20} />
            <span className="mobilenav__label">{n.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
