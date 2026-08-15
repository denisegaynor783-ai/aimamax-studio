// ============================================================
// AIMAMAX Studio — 全局状态（zustand）
// 单一事实源：设置 / 当前项目 / 画布节点 / 资产 / 生成态
// ============================================================
import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type {
  AppSettings,
  Asset,
  GenKind,
  GenStatus,
  GenHistoryItem,
  Project,
  ProjectKind,
  StudioEdge,
  StudioNode,
  StudioNodeData,
  NodeKind,
  EdgeRel,
  StageObject,
  StageShot,
  StageObjectType,
  Vec3,
} from "./types";
import {
  defaultProviders,
  generate as runGenerate,
} from "./providers";
import { getContext, composePrompt, initImageFor } from "./graph";
import * as db from "./db";

function defaultSettings(): AppSettings {
  return {
    providers: defaultProviders(),
    demoMode: true,
    defaultImageModel: "demo-poster",
    defaultVideoModel: "demo-reel",
    defaultTextModel: "demo-script",
  };
}

const KIND_LABEL: Record<NodeKind, string> = {
  character: "角色",
  scene: "场景",
  shot: "分镜",
  asset: "素材",
  prompt: "生成",
  music: "音乐",
  text: "文本",
  script: "剧本",
  generator: "生成器",
  group: "分组",
};

const PROJECT_LABEL: Record<ProjectKind, string> = {
  film: "短片",
  comic: "漫剧",
  ad: "广告",
  musicvideo: "MV",
  blank: "空白",
};

interface StudioState {
  ready: boolean;
  settings: AppSettings;
  project: Project | null;
  nodes: StudioNode[];
  edges: StudioEdge[];
  selectedNodeId: string | null;
  assets: Asset[];
  busy: boolean;
  busyNodeId: string | null;
  // 3D 导演台
  stageObjects: StageObject[];
  stageShots: StageShot[];
  selectedStageId: string | null;
  // 工作台视图模式（画布 / 3D 导演台），菜单可切换
  studioMode: "canvas" | "stage";
  // 历史 / 剪贴板（撤销重做 / 复制粘贴）
  past: { nodes: StudioNode[]; edges: StudioEdge[] }[];
  future: { nodes: StudioNode[]; edges: StudioEdge[] }[];
  clipboard: { id: string; data: StudioNodeData; position: { x: number; y: number } }[];
  // 生成历史（跨会话，复用 AI 生成结果）
  genHistory: GenHistoryItem[];
  // 分镜时间线手动排序（拖拽重排后写入；缺省为空=按连线时序拓扑排序）
  timelineOrder: string[];

  // 初始化
  init: () => Promise<void>;
  // 设置
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  saveProvider: (p: AppSettings["providers"][number]) => Promise<void>;
  // 项目
  createProject: (kind: ProjectKind, name?: string) => Promise<string>;
  openProject: (id: string) => Promise<void>;
  closeProject: () => void;
  renameCurrent: (name: string) => Promise<void>;
  deleteCurrent: () => Promise<void>;
  saveCurrent: (thumb?: string) => Promise<void>;
  // 画布
  onNodesChange: (c: NodeChange[]) => void;
  onEdgesChange: (c: EdgeChange[]) => void;
  onConnect: (c: Connection) => string;
  setEdgeRel: (id: string, rel: EdgeRel) => void;
  connectRel: (source: string, target: string, rel: EdgeRel) => string;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => string;
  duplicateNode: (id: string) => string | null;
  storyboardFromText: (nodeId: string) => number;
  applyLayout: (positions: Record<string, { x: number; y: number }>) => void;
  updateNodeData: (id: string, patch: Partial<StudioNodeData>) => void;
  updateNodePayload: (id: string, patch: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  // 历史 / 剪贴板
  commit: () => void;
  undo: () => void;
  redo: () => void;
  copySelection: () => number;
  pasteClipboard: () => number;
  deleteSelected: () => void;
  // 分组
  groupNodes: (ids?: string[]) => string | null;
  ungroupNodes: (groupId: string) => void;
  toggleGroup: (groupId: string) => void;
  // 资产节点
  insertAssetNode: (assetId: string, position: { x: number; y: number }) => string | null;
  // 生成
  generateFromNode: (id: string, kind: GenKind, modelOverride?: string) => Promise<void>;
  // 连通性链式动作：结果→素材 / 素材→下游生成器
  resultToAssetNode: (id: string) => string | null;
  assetToGenerator: (id: string) => string | null;
  // 生成历史记录 / 清空
  recordGenHistory: (item: GenHistoryItem) => void;
  clearGenHistory: () => void;
  // 分镜时间线排序（手动拖拽重排）
  setTimelineOrder: (order: string[]) => void;
  // 3D 导演台
  addStageObject: (type: StageObjectType) => string;
  updateStageObject: (id: string, patch: Partial<StageObject>) => void;
  removeStageObject: (id: string) => void;
  selectStage: (id: string | null) => void;
  takeShot: (thumb: string, camera: { pos: Vec3; target: Vec3 }) => void;
  removeShot: (shotId: string) => void;
  generateShotKeyframe: (shotId: string) => Promise<void>;
  sendShotToCanvas: (shotId: string) => void;
  collectShot: (shotId: string) => Promise<void>;
  saveStage: () => Promise<void>;
  // 视图模式切换（画布 / 3D 导演台）
  setStudioMode: (m: "canvas" | "stage") => void;
  // 资产
  refreshAssets: () => Promise<void>;
  addAsset: (a: Asset) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;
}

function blankDoc(): { nodes: StudioNode[]; edges: StudioEdge[] } {
  const root: StudioNode = {
    id: db.uid(),
    type: "studio",
    position: { x: 0, y: 0 },
    data: { kind: "text", label: "项目脚本", payload: { note: "在此写下你的故事 / 创意简报，再拖出角色与分镜。" } },
  };
  return { nodes: [root], edges: [] };
}

export const useStudio = create<StudioState>((set, get) => ({
  ready: false,
  settings: defaultSettings(),
  project: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  assets: [],
  genHistory: [],
  timelineOrder: [],
  busy: false,
  busyNodeId: null,
  stageObjects: [],
  stageShots: [],
  selectedStageId: null,
  studioMode: "canvas",
  past: [],
  future: [],
  clipboard: [],

  init: async () => {
    let settings = await db.getSettings();
    if (!settings) {
      settings = defaultSettings();
      await db.saveSettings(settings);
    }
    const assets = await db.listAssets();
    set({ ready: true, settings, assets });
  },

  updateSettings: async (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await db.saveSettings(next);
  },

  saveProvider: async (p) => {
    const providers = get().settings.providers.map((x) => (x.id === p.id ? p : x));
    const next = { ...get().settings, providers };
    set({ settings: next });
    await db.saveSettings(next);
  },

  createProject: async (kind, name) => {
    const id = db.uid();
    const doc = blankDoc();
    const project: Project = {
      id,
      name: name?.trim() || `${PROJECT_LABEL[kind]}项目 ${new Date().toLocaleDateString("zh-CN")}`,
      kind,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      doc: { nodes: doc.nodes, edges: doc.edges, viewport: { x: 200, y: 120, zoom: 0.9 } },
    };
    await db.saveProject(project);
    set({ project, nodes: doc.nodes, edges: doc.edges, selectedNodeId: null });
    return id;
  },

  openProject: async (id) => {
    const p = await db.getProject(id);
    if (!p) return;
    set({
      project: p,
      nodes: p.doc.nodes ?? [],
      edges: p.doc.edges ?? [],
      selectedNodeId: null,
      genHistory: p.generationHistory ?? [],
      timelineOrder: p.doc.timelineOrder ?? [],
      stageObjects: p.stage?.objects ?? [],
      stageShots: p.stage?.shots ?? [],
      selectedStageId: null,
    });
  },

  closeProject: () => set({ project: null, nodes: [], edges: [], selectedNodeId: null, genHistory: [], timelineOrder: [] }),

  renameCurrent: async (name) => {
    const p = get().project;
    if (!p) return;
    p.name = name;
    set({ project: { ...p } });
    await db.saveProject(p);
  },

  deleteCurrent: async () => {
    const p = get().project;
    if (!p) return;
    await db.deleteProject(p.id);
    set({ project: null, nodes: [], edges: [], selectedNodeId: null });
  },

  saveCurrent: async (thumb) => {
    const p = get().project;
    if (!p) return;
    const next: Project = {
      ...p,
      doc: { nodes: get().nodes, edges: get().edges, viewport: p.doc.viewport, timelineOrder: get().timelineOrder },
      thumb: thumb ?? p.thumb,
      stage: { objects: get().stageObjects, shots: get().stageShots },
    };
    await db.saveProject(next);
    set({ project: next });
  },

  onNodesChange: (c) => {
    // 拖拽结束 / 删除 前记录历史，使这些操作可撤销
    if (c.some((ch) => (ch.type === "position" && ch.dragging === false) || ch.type === "remove")) {
      get().commit();
    }
    let nodes = get().nodes;
    // 分组拖拽同步：移动 group 节点时联动其成员
    c.forEach((ch) => {
      if (ch.type === "position" && ch.position) {
        const g = nodes.find((n) => n.id === ch.id);
        if (g && g.data.kind === "group" && !g.data.payload.collapsed) {
          const dx = ch.position.x - g.position.x;
          const dy = ch.position.y - g.position.y;
          if (dx || dy) {
            const gid = g.id;
            nodes = nodes.map((n) =>
              n.data.payload?.groupId === gid ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n
            );
          }
        }
      }
    });
    set({ nodes: applyNodeChanges(c, nodes) as StudioNode[] });
  },
  onEdgesChange: (c) => {
    if (c.some((ch) => ch.type === "remove")) get().commit();
    set({ edges: applyEdgeChanges(c, get().edges) as StudioEdge[] });
  },
  onConnect: (c) => {
    get().commit();
    const id = `e-${db.uid()}`;
    set({
      edges: addEdge(
        { ...c, id, data: { rel: "sequence" }, className: "rel-sequence", style: { stroke: "#ff6b1a" } },
        get().edges
      ) as StudioEdge[],
    });
    return id;
  },

  setEdgeRel: (id, rel) => {
    get().commit();
    const stroke = rel === "sequence" ? "#ff6b1a" : rel === "reference" ? "#4cc2ff" : "#3ddc84";
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, data: { ...(e.data ?? {}), rel }, className: `rel-${rel}`, style: { stroke } } : e
      ),
    });
  },

  // 程序化派生连线：带语义 rel（reference=引用派生 / sequence=时序 / audio=音频），不污染 undo 栈
  connectRel: (source, target, rel) => {
    const id = `e-${db.uid()}`;
    const stroke = rel === "sequence" ? "#ff6b1a" : rel === "reference" ? "#4cc2ff" : "#3ddc84";
    set({
      edges: addEdge(
        { id, source, target, sourceHandle: null, targetHandle: null, data: { rel }, className: `rel-${rel}`, style: { stroke } },
        get().edges
      ) as StudioEdge[],
    });
    return id;
  },

  addNode: (kind, position) => {
    get().commit();
    const id = db.uid();
    const counts = get().nodes.filter((n) => n.data.kind === kind).length + 1;
    const isGen = kind === "generator";
    const node: StudioNode = {
      id,
      type: "studio",
      position,
      data: {
        kind,
        label: `${KIND_LABEL[kind]} ${counts}`,
        payload: { results: [], note: "", isGenerator: isGen, generatorType: isGen ? "image" : undefined },
      },
    };
    set({ nodes: [...get().nodes, node], selectedNodeId: id });
    return id;
  },

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    }),

  updateNodePayload: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, payload: { ...n.data.payload, ...patch } } } : n
      ),
    }),

  deleteNode: (id) => {
    get().commit();
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  duplicateNode: (id) => {
    get().commit();
    const n = get().nodes.find((x) => x.id === id);
    if (!n) return null;
    const copy: StudioNode = {
      ...n,
      id: db.uid(),
      position: { x: n.position.x + 44, y: n.position.y + 44 },
      data: { ...n.data, payload: { ...n.data.payload, results: [] } },
    };
    set({ nodes: [...get().nodes, copy], selectedNodeId: copy.id });
    return copy.id;
  },

  /** 文本节点离线智能分镜：按换行拆句 → 生成时序分镜节点链（不消耗 API） */
  storyboardFromText: (nodeId) => {
    get().commit();
    const node = get().nodes.find((x) => x.id === nodeId);
    if (!node) return 0;
    const text = node.data.payload.note || node.data.payload.prompt || "";
    const lines = text
      .split(/\r?\n/)
      .map((s) => s.replace(/^[\s\d.、)）\-—]+/, "").trim())
      .filter(Boolean)
      .slice(0, 24);
    if (lines.length === 0) return 0;
    const baseX = node.position.x;
    const baseY = node.position.y + 180;
    const created: StudioNode[] = lines.map((line, i) => ({
      id: db.uid(),
      type: "studio",
      position: { x: baseX + (i % 2) * 280, y: baseY + Math.floor(i / 2) * 160 },
      data: { kind: "shot", label: `分镜 ${i + 1}`, payload: { prompt: line, results: [], note: "" } },
    }));
    const mkEdge = (s: string, t: string, rel: EdgeRel): StudioEdge => ({
      id: `e-${db.uid()}`,
      source: s,
      target: t,
      data: { rel },
      className: `rel-${rel}`,
      style: { stroke: rel === "sequence" ? "#ff6b1a" : rel === "reference" ? "#4cc2ff" : "#3ddc84" },
    });
    const newEdges: StudioEdge[] = [];
    if (created.length) {
      newEdges.push(mkEdge(node.id, created[0].id, "reference"));
      for (let i = 1; i < created.length; i++) newEdges.push(mkEdge(created[i - 1].id, created[i].id, "sequence"));
      // —— 连通性：把画布上已有的角色/场景卡自动引用到首镜头，让设定流过分镜 ——
      const existingContext = get()
        .nodes.filter((n) => (n.data.kind === "character" || n.data.kind === "scene") && !created.some((c) => c.id === n.id));
      existingContext.forEach((c) => newEdges.push(mkEdge(c.id, created[0].id, "reference")));
    }
    set({ nodes: [...get().nodes, ...created], edges: [...get().edges, ...newEdges], selectedNodeId: null });
    return created.length;
  },

  applyLayout: (positions) => {
    get().commit();
    set({
      nodes: get().nodes.map((n) => (positions[n.id] ? { ...n, position: positions[n.id] } : n)),
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  // —— 历史栈（撤销 / 重做） ——
  commit: () => {
    const { past, nodes, edges } = get();
    const next = [...past, { nodes: structuredClone(nodes), edges: structuredClone(edges) }];
    if (next.length > 60) next.shift();
    set({ past: next, future: [] });
  },
  undo: () => {
    const { past, nodes, edges, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [{ nodes: structuredClone(nodes), edges: structuredClone(edges) }, ...future].slice(0, 60),
      nodes: prev.nodes,
      edges: prev.edges,
    });
  },
  redo: () => {
    const { future, nodes, edges, past } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      future: future.slice(1),
      past: [...past, { nodes: structuredClone(nodes), edges: structuredClone(edges) }].slice(-60),
      nodes: next.nodes,
      edges: next.edges,
    });
  },

  // —— 复制 / 粘贴 / 批量删除 ——
  copySelection: () => {
    const sel = get().nodes.filter((n) => (n as unknown as { selected?: boolean }).selected && n.data.kind !== "group");
    const clip = sel.map((n) => ({ id: n.id, data: structuredClone(n.data), position: { ...n.position } }));
    set({ clipboard: clip });
    return clip.length;
  },
  pasteClipboard: () => {
    const clip = get().clipboard;
    if (!clip || clip.length === 0) return 0;
    get().commit();
    const oldToNew = new Map<string, string>();
    clip.forEach((c) => oldToNew.set(c.id, db.uid()));
    const created: StudioNode[] = clip.map((c) => ({
      id: oldToNew.get(c.id)!,
      type: "studio",
      position: { x: c.position.x + 44, y: c.position.y + 44 },
      data: {
        ...structuredClone(c.data),
        payload: { ...structuredClone(c.data.payload), groupId: undefined, results: [] },
      },
    }));
    const strokeFor = (rel: EdgeRel) => (rel === "sequence" ? "#ff6b1a" : rel === "reference" ? "#4cc2ff" : "#3ddc84");
    const newEdges: StudioEdge[] = get()
      .edges.filter((e) => oldToNew.has(e.source) && oldToNew.has(e.target))
      .map((e) => {
        const rel = e.data?.rel ?? "sequence";
        return {
          id: `e-${db.uid()}`,
          source: oldToNew.get(e.source)!,
          target: oldToNew.get(e.target)!,
          data: { rel },
          className: `rel-${rel}`,
          style: { stroke: strokeFor(rel) },
        } as StudioEdge;
      });
    set({
      nodes: [...get().nodes, ...created],
      edges: [...get().edges, ...newEdges],
      selectedNodeId: created.length ? created[created.length - 1].id : get().selectedNodeId,
    });
    return created.length;
  },
  deleteSelected: () => {
    const sel = get().nodes.filter((n) => (n as unknown as { selected?: boolean }).selected);
    if (sel.length === 0) return;
    get().commit();
    const ids = new Set(sel.map((n) => n.id));
    set({
      nodes: get().nodes.filter((n) => !ids.has(n.id)),
      edges: get().edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
      selectedNodeId: null,
    });
  },

  // —— 节点分组 / 折叠 ——
  groupNodes: (ids) => {
    const members = (ids && ids.length
      ? get().nodes.filter((n) => ids.includes(n.id))
      : get().nodes.filter((n) => (n as unknown as { selected?: boolean }).selected)
    ).filter((n) => n.data.kind !== "group");
    if (members.length < 2) return null;
    get().commit();
    const pad = 36;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    members.forEach((m) => {
      const w = ((m as unknown as { measured?: { width?: number } }).measured?.width ?? 240);
      const h = ((m as unknown as { measured?: { height?: number } }).measured?.height ?? 140);
      minX = Math.min(minX, m.position.x);
      minY = Math.min(minY, m.position.y);
      maxX = Math.max(maxX, m.position.x + w);
      maxY = Math.max(maxY, m.position.y + h);
    });
    const gid = db.uid();
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const groupCount = get().nodes.filter((n) => n.data.kind === "group").length + 1;
    const groupNode: StudioNode = {
      id: gid,
      type: "group",
      position: { x: minX - pad, y: minY - pad },
      zIndex: 0,
      data: {
        kind: "group",
        label: `分组 ${groupCount}`,
        payload: { collapsed: false, count: members.length, dimensions: { w, h }, results: [] },
      },
    };
    const updated = get().nodes.map((n) =>
      members.some((m) => m.id === n.id)
        ? { ...n, data: { ...n.data, payload: { ...n.data.payload, groupId: gid } } }
        : n
    );
    set({ nodes: [groupNode, ...updated], selectedNodeId: gid });
    return gid;
  },
  ungroupNodes: (groupId) => {
    const g = get().nodes.find((n) => n.id === groupId);
    if (!g) return;
    get().commit();
    set({
      nodes: get()
        .nodes.filter((n) => n.id !== groupId)
        .map((n) =>
          n.data.payload?.groupId === groupId
            ? { ...n, data: { ...n.data, payload: { ...n.data.payload, groupId: undefined, hidden: false } } }
            : n
        ),
    });
  },
  toggleGroup: (groupId) => {
    const g = get().nodes.find((n) => n.id === groupId);
    if (!g) return;
    get().commit();
    const nextCollapsed = !g.data.payload.collapsed;
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === groupId) return { ...n, data: { ...n.data, payload: { ...n.data.payload, collapsed: nextCollapsed } } };
        if (n.data.payload?.groupId === groupId) return { ...n, hidden: nextCollapsed };
        return n;
      }),
    });
  },

  // —— 从资产库插入素材节点 ——
  insertAssetNode: (assetId, position) => {
    const a = get().assets.find((x) => x.id === assetId);
    if (!a) return null;
    get().commit();
    const id = db.uid();
    const node: StudioNode = {
      id,
      type: "studio",
      position,
      data: {
        kind: "asset",
        label: a.name,
        payload: {
          results: a.preview
            ? [{ id: db.uid(), kind: "image" as GenKind, status: "success" as GenStatus, url: a.preview, createdAt: Date.now() }]
            : [],
          note: (a.tags || []).join("、"),
        },
      },
    };
    set({ nodes: [...get().nodes, node], selectedNodeId: id });
    return id;
  },

  recordGenHistory: (item) => {
    const list = [...get().genHistory, item];
    set({ genHistory: list });
    const project = get().project;
    if (project) {
      const next = { ...project, generationHistory: [...(project.generationHistory ?? []), item] };
      set({ project: next });
      void db.saveProject(next);
    }
  },

  clearGenHistory: () => {
    set({ genHistory: [] });
    const project = get().project;
    if (project) {
      const next = { ...project, generationHistory: [] };
      set({ project: next });
      void db.saveProject(next);
    }
  },

  setTimelineOrder: (order) => {
    set({ timelineOrder: order });
    void get().saveCurrent();
  },

  generateFromNode: async (id, kind, modelOverride) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    const { settings, nodes, edges } = get();
    // —— 连通性：折叠所有直接上游为结构化上下文 ——
    const ctx = getContext(nodes, edges, id);
    const userPrompt = node.data.payload.prompt || node.data.label;
    const prompt = composePrompt(ctx, userPrompt, kind);
    // 上游参考图（素材/角色图）→ 图生图一致性
    const initImage = kind === "image" ? initImageFor(nodes, edges, id) : undefined;
    const model =
      modelOverride ||
      (kind === "image"
        ? settings.defaultImageModel
        : kind === "video"
        ? settings.defaultVideoModel
        : settings.defaultTextModel);
    // 节点显式指定接口优先；否则按运行模式 / 首个可用供应商
    const provider = node.data.payload.provider || (settings.demoMode ? "demo" : firstEnabledProvider(settings));
    set({ busy: true, busyNodeId: id });
    const result = await runGenerate(
      { kind, prompt, model, provider, negativePrompt: node.data.payload.negativePrompt, params: node.data.payload.params, initImage },
      settings
    );
    const results = [...(node.data.payload.results ?? []), result];
    get().updateNodePayload(id, { results });
    set({ busy: false, busyNodeId: null });
    if (result.status === "success" && result.url) {
      get().recordGenHistory({
        id: db.uid(),
        nodeId: id,
        nodeLabel: node.data.label,
        kind,
        model: result.model || model,
        provider: result.provider || provider,
        prompt: userPrompt,
        url: result.url,
        createdAt: result.createdAt || Date.now(),
      });
    }
  },

  /** 结果 → 素材节点：把某节点的生成结果落成一个可复用的素材节点（reference 连线） */
  resultToAssetNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return null;
    const latest = (node.data.payload.results ?? []).filter((r) => r.status === "success").slice(-1)[0];
    if (!latest) return null;
    get().commit();
    const aid = db.uid();
    const asset: StudioNode = {
      id: aid,
      type: "studio",
      position: { x: node.position.x + 320, y: node.position.y },
      data: {
        kind: "asset",
        label: `${node.data.label} · 素材`,
        payload: {
          results: [{ ...latest, id: db.uid() }],
          note: (node.data.payload.tags ?? []).join("、") || node.data.payload.prompt?.slice(0, 40) || "",
        },
      },
    };
    const rel: EdgeRel = "reference";
    const stroke = "#4cc2ff";
    const edge: StudioEdge = {
      id: `e-${db.uid()}`,
      source: id,
      target: aid,
      data: { rel },
      className: `rel-${rel}`,
      style: { stroke },
    };
    set({ nodes: [...get().nodes, asset], edges: [...get().edges, edge], selectedNodeId: aid });
    return aid;
  },

  /** 素材 → 下游生成器：从素材节点派生一个消费它的生成器（reference 连线） */
  assetToGenerator: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return null;
    get().commit();
    const gid = db.uid();
    const gen: StudioNode = {
      id: gid,
      type: "studio",
      position: { x: node.position.x + 320, y: node.position.y },
      data: {
        kind: "generator",
        label: `${node.data.label} · 生成器`,
        payload: { results: [], note: "", isGenerator: true, generatorType: "image" },
      },
    };
    const rel: EdgeRel = "reference";
    const stroke = "#4cc2ff";
    const edge: StudioEdge = {
      id: `e-${db.uid()}`,
      source: id,
      target: gid,
      data: { rel },
      className: `rel-${rel}`,
      style: { stroke },
    };
    set({ nodes: [...get().nodes, gen], edges: [...get().edges, edge], selectedNodeId: gid });
    return gid;
  },

  // —— 3D 导演台 ——
  addStageObject: (type) => {
    const id = db.uid();
    const n = get().stageObjects.filter((o) => o.type === type).length + 1;
    const presets: Record<StageObjectType, Omit<StageObject, "id" | "name">> = {
      actor: { type: "actor", shape: "humanoid", position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: "#ff6b1a" },
      set: { type: "set", shape: "box", position: [0, -0.1, 0], rotation: [0, 0, 0], scale: [6, 0.2, 6], color: "#2a2a34" },
      prop: { type: "prop", shape: "cylinder", position: [2, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: "#4cc2ff" },
      light: { type: "light", shape: "sphere", position: [3, 4, 2], rotation: [0, 0, 0], scale: [0.4, 0.4, 0.4], color: "#ffd27a", intensity: 2.2 },
    };
    const base = presets[type];
    const nameMap: Record<StageObjectType, string> = { actor: "角色", set: "场景台", prop: "道具", light: "灯光" };
    const obj: StageObject = { id, name: `${nameMap[type]} ${n}`, ...base };
    set({ stageObjects: [...get().stageObjects, obj], selectedStageId: id });
    get().saveCurrent();
    return id;
  },

  updateStageObject: (id, patch) => {
    set({ stageObjects: get().stageObjects.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  },

  removeStageObject: (id) => {
    set({
      stageObjects: get().stageObjects.filter((o) => o.id !== id),
      selectedStageId: get().selectedStageId === id ? null : get().selectedStageId,
    });
  },

  selectStage: (id) => set({ selectedStageId: id }),

  takeShot: (thumb, camera) => {
    if (!get().project) return;
    const id = db.uid();
    const n = get().stageShots.length + 1;
    const shot: StageShot = {
      id,
      name: `镜头 ${n}`,
      thumb,
      objects: JSON.parse(JSON.stringify(get().stageObjects)) as StageObject[],
      camera,
      createdAt: Date.now(),
    };
    set({ stageShots: [...get().stageShots, shot] });
    get().saveCurrent();
  },

  removeShot: (shotId) => {
    set({ stageShots: get().stageShots.filter((s) => s.id !== shotId) });
    get().saveCurrent();
  },

  generateShotKeyframe: async (shotId) => {
    const shot = get().stageShots.find((s) => s.id === shotId);
    if (!shot) return;
    const { settings } = get();
    const prompt = describeShot(shot.objects);
    const model = settings.defaultImageModel;
    const provider = settings.demoMode ? "demo" : firstEnabledProvider(settings);
    set({
      stageShots: get().stageShots.map((s) => (s.id === shotId ? { ...s, keyframeStatus: "pending" } : s)),
    });
    const result = await runGenerate({ kind: "image", prompt, model, provider }, settings);
    set({
      stageShots: get().stageShots.map((s) =>
        s.id === shotId
          ? { ...s, keyframeUrl: result.url, keyframeStatus: result.status === "success" ? "success" : "error" }
          : s
      ),
    });
    if (result.status === "success" && result.url) {
      get().recordGenHistory({
        id: db.uid(),
        nodeId: shotId,
        nodeLabel: shot.name,
        kind: "image",
        model,
        provider,
        prompt,
        url: result.url,
        createdAt: Date.now(),
      });
    }
    get().saveCurrent();
  },

  sendShotToCanvas: (shotId) => {
    const shot = get().stageShots.find((s) => s.id === shotId);
    if (!shot) return;
    const id = get().addNode("shot", { x: 120 + Math.random() * 260, y: 120 + Math.random() * 160 });
    const url = shot.keyframeUrl || shot.thumb;
    get().updateNodePayload(id, {
      label: shot.name,
      results: [{ id: db.uid(), kind: "image", status: "success", url, createdAt: Date.now() }],
    });
  },

  collectShot: async (shotId) => {
    const shot = get().stageShots.find((s) => s.id === shotId);
    if (!shot) return;
    await get().addAsset({
      id: db.uid(),
      kind: "scene",
      name: shot.name,
      preview: shot.keyframeUrl || shot.thumb,
      tags: ["3D导演台", "镜头"],
      createdAt: Date.now(),
    });
  },

  saveStage: async () => {
    await get().saveCurrent();
  },

  refreshAssets: async () => set({ assets: await db.listAssets() }),

  addAsset: async (a) => {
    await db.putAsset(a);
    set({ assets: await db.listAssets() });
  },

  removeAsset: async (id) => {
    await db.deleteAsset(id);
    set({ assets: get().assets.filter((x) => x.id !== id) });
  },

  // 视图模式切换（画布 / 3D 导演台）
  setStudioMode: (m) => set({ studioMode: m }),
}));

function firstEnabledProvider(s: AppSettings): string {
  const p = s.providers.find((x) => x.enabled && x.kind !== "demo" && x.apiKey);
  return p?.id ?? "demo";
}

// 仅开发态暴露状态，便于自动化冒烟（生产构建不挂载）
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && typeof window !== "undefined") {
  (window as unknown as { __studio: typeof useStudio }).__studio = useStudio;
}

/** 把舞台对象描述成镜头提示词（供 AI 关键帧生成） */
function describeShot(objects: StageObject[]): string {
  const actors = objects.filter((o) => o.type === "actor").map((o) => o.name);
  const sets = objects.filter((o) => o.type === "set").map((o) => o.name);
  const props = objects.filter((o) => o.type === "prop").map((o) => o.name);
  const lights = objects.filter((o) => o.type === "light");
  const mood = lights.length ? "电影感布光，戏剧性明暗对比" : "均匀照明";
  const parts = ["电影感分镜关键帧"];
  if (actors.length) parts.push(`画面中有${actors.join("、")}`);
  if (sets.length) parts.push(`场景为${sets.join("、")}`);
  if (props.length) parts.push(`道具包含${props.join("、")}`);
  parts.push(mood);
  return parts.join("，") + "。";
}
