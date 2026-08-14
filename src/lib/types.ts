// ============================================================
// AIMAMAX Studio — 核心数据类型
// ============================================================

export type ProjectKind = "film" | "comic" | "ad" | "musicvideo" | "blank";

export interface ProjectMeta {
  id: string;
  name: string;
  kind: ProjectKind;
  createdAt: number;
  updatedAt: number;
  /** 快照缩略图（dataURL），用于「我的项目」网格 */
  thumb?: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/** 画布持久化内容 */
export interface CanvasDoc {
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: Viewport;
}

export interface Project extends ProjectMeta {
  doc: CanvasDoc;
}

// —— 语义节点 ——
export type NodeKind =
  | "character" // 角色卡
  | "scene" // 场景卡
  | "shot" // 分镜格
  | "asset" // 素材引用
  | "prompt" // 生成任务
  | "music" // 音乐轨
  | "text"; // 文本 / 脚本

export interface StudioNodeData {
  kind: NodeKind;
  label: string;
  /** 节点的 AI / 业务负载 */
  payload: {
    prompt?: string;
    model?: string;
    provider?: string;
    negativePrompt?: string;
    params?: Record<string, number | string>;
    /** 生成结果（图 / 视频 / 文） */
    results?: GenResult[];
    /** 角色/场景的结构化字段 */
    fields?: Record<string, string>;
    note?: string;
  };
  [key: string]: unknown;
}

export interface StudioNode {
  id: string;
  type: "studio";
  position: { x: number; y: number };
  data: StudioNodeData;
}

export type EdgeRel = "sequence" | "reference" | "audio";

export interface StudioEdge {
  id: string;
  source: string;
  target: string;
  data?: { rel: EdgeRel };
  type?: string;
  className?: string;
  style?: Record<string, unknown>;
}

// —— 生成结果 ——
export type GenKind = "image" | "video" | "text";
export type GenStatus = "idle" | "pending" | "success" | "error";

export interface GenResult {
  id: string;
  kind: GenKind;
  status: GenStatus;
  /** 图片/视频 URL 或内嵌 dataURL */
  url?: string;
  text?: string;
  model?: string;
  provider?: string;
  error?: string;
  createdAt: number;
}

// —— AI 供应商 ——
export type ProviderKind = "openai" | "toapis" | "volcengine" | "demo";

export interface ProviderConfig {
  id: string;
  kind: ProviderKind;
  name: string;
  baseUrl: string;
  apiKey: string;
  /** 该供应商下可用模型 id 列表（用户可勾选启用） */
  models: string[];
  enabled: boolean;
}

export interface AppSettings {
  providers: ProviderConfig[];
  demoMode: boolean;
  defaultImageModel: string;
  defaultVideoModel: string;
  defaultTextModel: string;
}

// —— 资产库 ——
export type AssetKind = "character" | "scene" | "prop" | "music" | "style";

export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  /** 预览（dataURL 或外链） */
  preview?: string;
  /** 关联到哪个节点（若由画布生成而来） */
  sourceNodeId?: string;
  tags: string[];
  createdAt: number;
}

// —— 生成请求 ——
export interface GenRequest {
  kind: GenKind;
  prompt: string;
  negativePrompt?: string;
  model: string;
  provider: string;
  params?: Record<string, number | string>;
}
