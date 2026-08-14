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
  Project,
  ProjectKind,
  StudioEdge,
  StudioNode,
  StudioNodeData,
  NodeKind,
  StageObject,
  StageShot,
  StageObjectType,
  Vec3,
} from "./types";
import {
  defaultProviders,
  generate as runGenerate,
} from "./providers";
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
  onConnect: (c: Connection) => void;
  addNode: (kind: NodeKind, position: { x: number; y: number }) => string;
  updateNodeData: (id: string, patch: Partial<StudioNodeData>) => void;
  updateNodePayload: (id: string, patch: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  // 生成
  generateFromNode: (id: string, kind: GenKind, modelOverride?: string) => Promise<void>;
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
  busy: false,
  busyNodeId: null,
  stageObjects: [],
  stageShots: [],
  selectedStageId: null,

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
      stageObjects: p.stage?.objects ?? [],
      stageShots: p.stage?.shots ?? [],
      selectedStageId: null,
    });
  },

  closeProject: () => set({ project: null, nodes: [], edges: [], selectedNodeId: null }),

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
      doc: { nodes: get().nodes, edges: get().edges, viewport: p.doc.viewport },
      thumb: thumb ?? p.thumb,
      stage: { objects: get().stageObjects, shots: get().stageShots },
    };
    await db.saveProject(next);
    set({ project: next });
  },

  onNodesChange: (c) => set({ nodes: applyNodeChanges(c, get().nodes) as StudioNode[] }),
  onEdgesChange: (c) => set({ edges: applyEdgeChanges(c, get().edges) as StudioEdge[] }),
  onConnect: (c) =>
    set({
      edges: addEdge(
        { ...c, id: `e-${db.uid()}`, data: { rel: "sequence" }, className: "rel-sequence", style: { stroke: "#ff6b1a" } },
        get().edges
      ) as StudioEdge[],
    }),

  addNode: (kind, position) => {
    const id = db.uid();
    const counts = get().nodes.filter((n) => n.data.kind === kind).length + 1;
    const node: StudioNode = {
      id,
      type: "studio",
      position,
      data: {
        kind,
        label: `${KIND_LABEL[kind]} ${counts}`,
        payload: { results: [], note: "" },
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
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  generateFromNode: async (id, kind, modelOverride) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    const { settings } = get();
    const prompt = node.data.payload.prompt || node.data.label;
    const model =
      modelOverride ||
      (kind === "image"
        ? settings.defaultImageModel
        : kind === "video"
        ? settings.defaultVideoModel
        : settings.defaultTextModel);
    const provider = settings.demoMode ? "demo" : firstEnabledProvider(settings);
    set({ busy: true, busyNodeId: id });
    const result = await runGenerate(
      { kind, prompt, model, provider, negativePrompt: node.data.payload.negativePrompt, params: node.data.payload.params },
      settings
    );
    const results = [...(node.data.payload.results ?? []), result];
    get().updateNodePayload(id, { results });
    set({ busy: false, busyNodeId: null });
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
}));

function firstEnabledProvider(s: AppSettings): string {
  const p = s.providers.find((x) => x.enabled && x.kind !== "demo" && x.apiKey);
  return p?.id ?? "demo";
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
