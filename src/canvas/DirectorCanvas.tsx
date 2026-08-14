// ============================================================
// AIMAMAX Studio — 导演台画布（React Flow 无限画布）
// 工具栏 / 添加节点 / 适应视图 / 截图保存 / 自动存稿
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { useStudio } from "../lib/store";
import { StudioNode } from "./StudioNode";
import { Button, IconButton } from "../components/ui";
import {
  IconPlus, IconCharacter, IconScene, IconImage, IconText, IconMusic, IconSave, IconFilm,
} from "../components/icons";
import type { NodeKind } from "../lib/types";

const nodeTypes = { studio: StudioNode };

const ADD_KINDS: { kind: NodeKind; label: string; icon: (p: { size?: number }) => JSX.Element }[] = [
  { kind: "character", label: "角色卡", icon: IconCharacter },
  { kind: "scene", label: "场景卡", icon: IconScene },
  { kind: "shot", label: "分镜格", icon: IconImage },
  { kind: "asset", label: "素材", icon: IconImage },
  { kind: "text", label: "文本 / 脚本", icon: IconText },
  { kind: "music", label: "音乐轨", icon: IconMusic },
];

export function DirectorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, saveCurrent, project } = useStudio();
  const rf = useReactFlow();
  const [addOpen, setAddOpen] = useState(false);

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
        <IconButton title="适应视图" onClick={() => rf.fitView({ padding: 0.2, duration: 400 })}>
          <IconFilm size={16} />
        </IconButton>
        <IconButton title="保存并截图" onClick={snapAndSave}>
          <IconSave size={16} />
        </IconButton>
      </div>

      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => useStudio.getState().selectNode(n.id)}
        onPaneClick={() => useStudio.getState().selectNode(null)}
        fitView
        minZoom={0.15}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: "default" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.07)" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const k = (n.data as { kind?: string })?.kind;
            if (k === "character") return "#ff6b1a";
            if (k === "scene") return "#4cc2ff";
            if (k === "shot") return "#ffc24b";
            return "#2a2a34";
          }}
          maskColor="rgba(7,7,9,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
