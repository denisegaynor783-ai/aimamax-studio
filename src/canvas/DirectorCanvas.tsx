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
import { useFullscreen } from "../lib/useFullscreen";
import { StudioNode } from "./StudioNode";
import { GroupNode } from "./GroupNode";
import { Button, IconButton } from "../components/ui";
import {
  IconPlus, IconImage, IconSave, IconExpand,
  IconFullscreenExit, IconLayout, IconGrid, IconAssetLib, IconTimeline,
} from "../components/icons";
import { NodeActionMenu } from "./NodeActionMenu";
import { NODE_PALETTE, ACTION_ITEMS, QUICK_GEN } from "./palette";
import type { NodeKind, EdgeRel as EdgeRelType } from "../lib/types";

const nodeTypes = { studio: StudioNode, group: GroupNode };

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
  script: "#e056fd",
  generator: "#ff6b1a",
  group: "#ffc24b",
};

type BgMode = "dots" | "lines" | "none";

export function DirectorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, setEdgeRel, addNode, saveCurrent, project,
    applyLayout, past, future, generateFromNode,
  } = useStudio();
  const rf = useReactFlow();
  const [addOpen, setAddOpen] = useState(false);
  const [bg, setBg] = useState<BgMode>("dots");
  const [pendingEdgeId, setPendingEdgeId] = useState<string | null>(null);
  // —— 右键上下文菜单（D2：统一浮动菜单） ——
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);
  const shots = nodes.filter((n) => n.data.kind === "shot");

  // —— 全屏工作台（OS 级覆盖整屏 + CSS 兜底），进入后重新适配视图 ——
  const { isFs, toggle } = useFullscreen(() =>
    window.setTimeout(() => rf.fitView({ padding: 0.2, duration: 300 }), 320)
  );

  // —— 自动存稿（防丢） ——
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => saveCurrent(), 1500);
    return () => clearTimeout(t);
  }, [nodes, edges, project, saveCurrent]);

  // —— 添加节点到视口中心（返回新建 id，供快捷生成复用） ——
  const addAtCenter = useCallback(
    (kind: NodeKind): string => {
      const rect = wrapRef.current?.getBoundingClientRect();
      const cx = rect ? rect.width / 2 : 400;
      const cy = rect ? rect.height / 2 : 300;
      const pos = rf.screenToFlowPosition({ x: rect!.left + cx, y: rect!.top + cy });
      const id = addNode(kind, { x: pos.x - 115, y: pos.y - 40 });
      setAddOpen(false);
      return id;
    },
    [rf, addNode]
  );

  // —— 快捷生成：视口中心新建分镜格并立即出图 / 出视频 ——
  const addAtCenterGen = useCallback(
    (gen: "image" | "video") => {
      const id = addAtCenter("shot");
      if (id) generateFromNode(id, gen);
    },
    [addAtCenter, generateFromNode]
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
              {/* 内容基元 */}
              {NODE_PALETTE.map((k) => {
                const I = k.icon;
                return (
                  <button key={k.kind + "-" + k.label} onClick={() => addAtCenter(k.kind)}>
                    <I size={16} /> {k.label}
                  </button>
                );
              })}
              <div className="addpop__div" />
              {/* 动作项：智能剪辑 / 导演台 / 逐帧拉片 */}
              {ACTION_ITEMS.map((a) => {
                const I = a.icon;
                return (
                  <button key={a.key} onClick={() => {
                    if (a.key === "smartClip") { const id = addAtCenter("shot"); if (id) generateFromNode(id, "video"); }
                    else if (a.key === "director") useStudio.getState().setStudioMode("stage");
                    else if (a.key === "frameStrip") {
                      // 逐帧拉片需要已知节点位置，从工具条调用时在中心派生
                      const cx = rf.getViewport().x, cy = rf.getViewport().y;
                      let prevId: string | null = null;
                      for (let i = 0; i < 3; i++) {
                        const id = addNode("shot", { x: cx + 200 + i * 300, y: cy + i * 8 });
                        if (prevId) useStudio.getState().connectRel(prevId, id, "sequence");
                        prevId = id;
                        if (id) useStudio.getState().updateNodePayload(id, { note: `帧 ${i + 1}` });
                      }
                    }
                    setAddOpen(false);
                  }}>
                    <I size={16} /> {a.label}
                    {a.badge && <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 4, opacity: 0.6 }}>{a.badge}</span>}
                    {a.badge2 && <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 4, opacity: 0.5 }}>{a.badge2}</span>}
                  </button>
                );
              })}
              <div className="addpop__div" />
              {/* 快捷生成（出图/出视频） */}
              {QUICK_GEN.map((q) => {
                const I = q.icon;
                return (
                  <button key={q.gen} onClick={() => addAtCenterGen(q.gen)}>
                    <I size={16} /> {q.label}
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
        <IconButton title="保存并截图" onClick={snapAndSave}>
          <IconSave size={16} />
        </IconButton>
        <IconButton title={isFs ? "退出全屏（Esc）" : "全屏工作台（沉浸创作 · 工具齐全）"} onClick={toggle}>
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
        onPaneClick={() => { useStudio.getState().selectNode(null); setPendingEdgeId(null); setCtxMenu(null); }}
        onNodeContextMenu={(event, node) => {
          const e = event as unknown as MouseEvent;
          e.preventDefault();
          const nodeId = node?.id ?? null;
          if (nodeId) {
            useStudio.getState().selectNode(nodeId);
            setCtxMenu({ x: e.clientX, y: e.clientY, nodeId });
          }
        }}
        onPaneContextMenu={(event) => {
          const e = event as unknown as MouseEvent;
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: null });
        }}
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

      {/* D3: 底部固定工具栏（整合分镜故事条） */}
      <div className="canvas-bottombar">
        <div className="canvas-bottombar__left">
          <IconButton title="资产管理" onClick={() => { /* TODO: 打开资产面板 */ }}>
            <IconAssetLib size={15} />
          </IconButton>
          <div className="bottombar__div" />
          <button className="bottombar__btn" disabled={past.length === 0} onClick={() => useStudio.getState().undo()} title="撤销 (Ctrl+Z)">↶ 撤销</button>
          <button className="bottombar__btn" disabled={future.length === 0} onClick={() => useStudio.getState().redo()} title="重做 (Ctrl+Shift+Z)">↷ 重做</button>
          <div className="bottombar__div" />
          <span className="flow-stat" title="画布节点总数">{nodes.length} 节点</span>
        </div>

        {/* 分镜故事条（嵌入底栏中央） */}
        {shots.length > 0 && (
          <div className="storyboard-strip storyboard-strip--inline">
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

        <div className="canvas-bottombar__right">
          <IconButton title="时间线" onClick={() => { /* TODO: 时间线面板 */ }}>
            <IconTimeline size={15} />
          </IconButton>
          <span className="flow-stat" style={{ minWidth: 42, textAlign: "center" }}>
            {Math.round(rf.getViewport().zoom * 100)}%
          </span>
        </div>
      </div>

      {/* D2: 右键统一浮动菜单 */}
      {ctxMenu && (
        <div
          className="ctx-overlay"
          onClick={() => setCtxMenu(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <NodeActionMenu
            nodeId={ctxMenu.nodeId ?? ""}
            position={{ x: 0, y: 0 }}
            screenPos={ctxMenu}
          />
          <button
            className="ctx-close"
            onClick={() => setCtxMenu(null)}
            title="关闭菜单"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
