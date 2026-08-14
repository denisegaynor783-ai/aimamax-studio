// ============================================================
// AIMAMAX Studio — 导演台画布（React Flow 无限画布）
// 多维增强：语义流动连线(关系选择器) · 一键拓扑智能排版 · 网格切换 · 节点统计HUD · 截图画布 · 自动存稿
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { useStudio } from "../lib/store";
import { StudioNode } from "./StudioNode";
import { Button, IconButton } from "../components/ui";
import {
  IconPlus, IconCharacter, IconScene, IconImage, IconText, IconMusic, IconSave, IconExpand,
  IconFullscreenExit, IconLayout, IconGrid,
} from "../components/icons";
import type { NodeKind, EdgeRel as EdgeRelType } from "../lib/types";

const nodeTypes = { studio: StudioNode };

const ADD_KINDS: { kind: NodeKind; label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { kind: "character", label: "角色卡", icon: IconCharacter },
  { kind: "scene", label: "场景卡", icon: IconScene },
  { kind: "shot", label: "分镜格", icon: IconImage },
  { kind: "asset", label: "素材", icon: IconImage },
  { kind: "text", label: "文本 / 脚本", icon: IconText },
  { kind: "music", label: "音乐轨", icon: IconMusic },
];

const REL_META: Record<EdgeRelType, { label: string; cls: string }> = {
  sequence: { label: "时序", cls: "rel-sequence" },
  reference: { label: "引用", cls: "rel-reference" },
  audio: { label: "音频", cls: "rel-audio" },
};

const KIND_COLOR: Record<string, string> = {
  character: "#ff6b1a",
  scene: "#4cc2ff",
  shot: "#ffc24b",
  asset: "#b98bff",
  prompt: "#ff6b1a",
  music: "#3ddc84",
  text: "#9aa0b5",
};

type BgMode = "dots" | "lines" | "none";

export function DirectorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, setEdgeRel, addNode, saveCurrent, project,
    applyLayout,
  } = useStudio();
  const rf = useReactFlow();
  const [addOpen, setAddOpen] = useState(false);
  const [bg, setBg] = useState<BgMode>("dots");
  const [pendingEdgeId, setPendingEdgeId] = useState<string | null>(null);
  const [isFs, setIsFs] = useState(false);
  const shots = nodes.filter((n) => n.data.kind === "shot");

  // —— 全屏工作台：优先 OS 级（覆盖整屏、隐藏外壳），被拦截则 CSS 铺满视口 ——
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const refit = useCallback(() => {
    window.setTimeout(() => rf.fitView({ padding: 0.2, duration: 300 }), 320);
  }, [rf]);
  const toggleFullscreen = useCallback(() => {
    const layout = document.getElementById("studio-layout");
    // 已处于 CSS 模拟全屏 → 退出
    if (layout?.classList.contains("fs-fake")) {
      layout.classList.remove("fs-fake");
      setIsFs(false);
      refit();
      return;
    }
    // 浏览器已 OS 全屏 → 退出
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    // 尝试 OS 级全屏：把整个 .app 根全屏（覆盖整块显示器）
    const root = (document.querySelector(".app") as HTMLElement | null) ?? layout;
    const req = root?.requestFullscreen?.();
    if (req && typeof req.then === "function") {
      req
        .then(() => refit())
        .catch(() => {
          // 被拦截（iframe / 权限）→ CSS 模拟铺满视口兜底
          layout?.classList.add("fs-fake");
          setIsFs(true);
          refit();
        });
    } else {
      layout?.classList.add("fs-fake");
      setIsFs(true);
      refit();
    }
  }, [refit]);

  // —— 自动存稿（防丢） ——
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => saveCurrent(), 1500);
    return () => clearTimeout(t);
  }, [nodes, edges, project, saveCurrent]);

  // —— 添加节点到视口中心 ——
  const addAtCenter = useCallback(
    (kind: NodeKind) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      const cx = rect ? rect.width / 2 : 400;
      const cy = rect ? rect.height / 2 : 300;
      const pos = rf.screenToFlowPosition({ x: rect!.left + cx, y: rect!.top + cy });
      addNode(kind, { x: pos.x - 115, y: pos.y - 40 });
      setAddOpen(false);
    },
    [rf, addNode]
  );

  // —— 连线：创建后弹出关系选择器 ——
  const handleConnect = useCallback(
    (c: Connection) => {
      const id = onConnect(c);
      setPendingEdgeId(id);
    },
    [onConnect]
  );

  // —— 一键拓扑智能排版（按时序边分层，左→右；其余附后） ——
  const autoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const seq = edges.filter((e) => (e.data?.rel ?? "sequence") === "sequence");
    const adj = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    nodes.forEach((n) => { adj.set(n.id, []); indeg.set(n.id, 0); });
    seq.forEach((e) => {
      if (adj.has(e.source) && indeg.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
      }
    });
    const layers: string[][] = [];
    const visited = new Set<string>();
    let frontier = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
    while (frontier.length) {
      layers.push(frontier);
      const next: string[] = [];
      frontier.forEach((id) => {
        (adj.get(id) ?? []).forEach((t) => {
          if (visited.has(t)) return;
          indeg.set(t, (indeg.get(t) ?? 1) - 1);
          if ((indeg.get(t) ?? 0) <= 0 && !next.includes(t)) next.push(t);
        });
        visited.add(id);
      });
      frontier = next.filter((id) => !visited.has(id));
    }
    const unvisited = nodes.map((n) => n.id).filter((id) => !visited.has(id));
    if (unvisited.length) layers.push(unvisited);

    const COL_W = 300;
    const ROW_H = 172;
    const pos: Record<string, { x: number; y: number }> = {};
    layers.forEach((layer, li) => {
      layer.forEach((id, ri) => {
        pos[id] = { x: li * COL_W, y: ri * ROW_H };
      });
    });
    applyLayout(pos);
    window.setTimeout(() => rf.fitView({ padding: 0.18, duration: 520 }), 60);
  }, [nodes, edges, applyLayout, rf]);

  // —— 截图保存缩略图 ——
  const snapAndSave = useCallback(async () => {
    const els = document.querySelector(".react-flow__viewport") as HTMLElement | null;
    const ns = rf.getNodes();
    if (!els || ns.length === 0) { await saveCurrent(); return; }
    try {
      const bounds = getNodesBounds(ns);
      const w = 480, h = 300;
      const vp = getViewportForBounds(bounds, w, h, 0.4, 2, 0.15);
      const url = await toPng(els, {
        backgroundColor: "#070709",
        width: w,
        height: h,
        style: {
          width: `${w}px`,
          height: `${h}px`,
          transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
        },
      });
      await saveCurrent(url);
    } catch {
      await saveCurrent();
    }
  }, [rf, saveCurrent]);

  // —— 待选关系的连线当前 rel ——
  const pendingRel = useMemo(() => {
    if (!pendingEdgeId) return null;
    return (edges.find((e) => e.id === pendingEdgeId)?.data?.rel ?? "sequence") as EdgeRelType;
  }, [pendingEdgeId, edges]);

  const bgVariant = bg === "dots" ? BackgroundVariant.Dots : bg === "lines" ? BackgroundVariant.Lines : null;

  return (
    <div ref={wrapRef} style={{ flex: 1, minHeight: 0, position: "relative" }}>
      {/* 工具条 */}
      <div className="flow-toolbar">
        <div style={{ position: "relative" }}>
          <Button size="sm" variant="primary" icon={<IconPlus size={14} />} onClick={() => setAddOpen((v) => !v)}>
            节点
          </Button>
          {addOpen && (
            <div className="addpop">
              {ADD_KINDS.map((k) => {
                const I = k.icon;
                return (
                  <button key={k.kind} onClick={() => addAtCenter(k.kind)}>
                    <I size={16} /> {k.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flow-toolbar__div" />

        <IconButton title="一键智能排版（按时序分层）" onClick={autoLayout}>
          <IconLayout size={16} />
        </IconButton>
        <IconButton
          title={bg === "dots" ? "网格：点（点此切换为线）" : bg === "lines" ? "网格：线（点此关闭）" : "网格：关（点此开启）"}
          onClick={() => setBg((b) => (b === "dots" ? "lines" : b === "lines" ? "none" : "dots"))}
        >
          <IconGrid size={16} />
        </IconButton>
        <IconButton title="适应视图" onClick={() => rf.fitView({ padding: 0.2, duration: 400 })}>
          <IconExpand size={16} />
        </IconButton>
        <IconButton title="保存并截图" onClick={snapAndSave}>
          <IconSave size={16} />
        </IconButton>
        <IconButton title={isFs ? "退出全屏（Esc）" : "全屏工作台（沉浸创作 · 工具齐全）"} onClick={toggleFullscreen}>
          {isFs ? <IconFullscreenExit size={16} /> : <IconExpand size={16} />}
        </IconButton>

        <div className="flow-toolbar__div" />
        <span className="flow-stat" title="画布节点总数">{nodes.length} 节点</span>
      </div>

      {/* 连线关系选择器 */}
      {pendingEdgeId && pendingRel && (
        <div className="edge-rel-pop">
          <span className="edge-rel-pop__title">连线关系</span>
          <div className="seg seg--sm">
            {(Object.keys(REL_META) as EdgeRelType[]).map((rel) => (
              <button
                key={rel}
                data-active={pendingRel === rel}
                className={REL_META[rel].cls}
                onClick={() => { setEdgeRel(pendingEdgeId, rel); setPendingEdgeId(null); }}
              >
                {REL_META[rel].label}
              </button>
            ))}
          </div>
          <button className="edge-rel-pop__x" onClick={() => setPendingEdgeId(null)} title="关闭">×</button>
        </div>
      )}

      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onEdgeClick={(_, e) => setPendingEdgeId(e.id)}
        onNodeClick={(_, n) => useStudio.getState().selectNode(n.id)}
        onPaneClick={() => { useStudio.getState().selectNode(null); setPendingEdgeId(null); }}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        minZoom={0.15}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: "default" }}
        proOptions={{ hideAttribution: true }}
      >
        {bgVariant !== null && (
          <Background variant={bgVariant} gap={bg === "lines" ? 32 : 28} size={bg === "lines" ? 1 : 1} color={bg === "lines" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)"} />
        )}
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => KIND_COLOR[(n.data as { kind?: string })?.kind ?? ""] ?? "#2a2a34"}
          nodeStrokeColor={(n) => KIND_COLOR[(n.data as { kind?: string })?.kind ?? ""] ?? "#2a2a34"}
          maskColor="rgba(7,7,9,0.7)"
        />
      </ReactFlow>

      {shots.length > 0 && (
        <div className="storyboard-strip">
          <div className="storyboard-strip__head">分镜</div>
          <div className="storyboard-strip__row">
            {shots.map((n) => {
              const r = (n.data.payload.results ?? []).find((x) => x.url);
              return (
                <button
                  key={n.id}
                  className="storyboard-chip"
                  title={n.data.label}
                  onClick={() => {
                    rf.setCenter(n.position.x, n.position.y, { zoom: 1.1, duration: 400 });
                    useStudio.getState().selectNode(n.id);
                  }}
                >
                  {r ? (
                    <img src={r.url} alt={n.data.label} />
                  ) : (
                    <span className="storyboard-chip__ph">
                      <IconImage size={14} />
                    </span>
                  )}
                  <span className="storyboard-chip__label">{n.data.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
