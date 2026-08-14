// ============================================================
// AIMAMAX Studio — 应用根：外壳 + HashRouter 路由
// ============================================================
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useStudio } from "./lib/store";
import { Rail, MobileNav } from "./components/shell";
import { TopBar } from "./components/TopBar";
import { Spinner } from "./components/ui";
import Discover from "./pages/Discover";
import Studio from "./pages/Studio";
import Assets from "./pages/Assets";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";

export default function App() {
  const { ready, init } = useStudio();

  useEffect(() => {
    init();
  }, [init]);

  if (!ready) {
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", gap: 12, color: "var(--text-dim)" }}>
        <Spinner size={28} />
        <div className="eyebrow">AIMAMAX STUDIO 启动中</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Rail />
      <div className="main">
        <TopBar />
        <Routes>
          <Route path="/" element={<Discover />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Discover />} />
        </Routes>
      </div>
      <MobileNav />
    </div>
  );
}
