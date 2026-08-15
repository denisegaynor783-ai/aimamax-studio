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
  /** 3D 导演台舞台数据（previz / 镜头时间线） */
  stage?: StageDoc;
}

// —— 3D 导演台 ——
export type StageObjectType = "actor" | "set" | "prop" | "light";
export type Vec3 = [number, number, number];

export interface StageObject {
  id: string;
  type: StageObjectType;
  name: string;
  /** 视觉形态：人形 / 方块 / 圆柱 / 球 / 锥 */
  shape: "humanoid" | "box" | "cylinder" | "sphere" | "cone";
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color: string;
  /** 灯光强度（仅 light） */
  intensity?: number;
}

export interface StageShot {
  id: string;
  name: string;
  /** 3D 预演截图（dataURL） */
  thumb: string;
  /** 拍摄时的场景快照 */
  objects: StageObject[];
  /** 拍摄机位 */
  camera: { pos: Vec3; target: Vec3 };
  /** AI 生成的关键帧（图） */
  keyframeUrl?: string;
  /** 关键帧生成状态 */
  keyframeStatus?: GenStatus;
  createdAt: number;
}

export interface StageDoc {
  objects: StageObject[];
  shots: StageShot[];
}

// —— 语义节点 ——
export type NodeKind =
  | "character" // 角色卡
  | "scene" // 场景卡
  | "shot" // 分镜格
  | "asset" // 素材引用
  | "prompt" // 生成任务
  | "music" // 音乐轨
  | "text" // 文本 / 脚本
  | "script" // 剧本（富信息卡片：标题+元数据+标签+内容）
  | "generator" // AI 生成器节点（剧本/图片/视频生成器）
  | "group"; // 节点分组（视觉包围盒，可折叠）

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
    // —— 剧本/脚本节点结构化字段（D1 富卡片） ——
    /** 类型标签（如 "古风 / 穿越 / 美文演绎"）*/
    genre?: string;
    /** 时长建议（如 "60~90秒"）*/
    duration?: string;
    /** 基调/氛围（如 "热血 × 盛唐史诗范"）*/
    mood?: string;
    /** 标签组（如 ["现代", "夜晚", "办公室"]）*/
    tags?: string[];
    // —— 生成器节点字段 ——
    /** 是否为生成器节点 */
    isGenerator?: boolean;
    /** 生成器类型：script / image / video */
    generatorType?: "script" | "image" | "video";
    /** 模板 ID（预设生成器配置）*/
    templateId?: string;
    /** 定价提示（如 "M$9.2/s"）*/
    pricing?: string;
    // —— 分组节点字段 ——
    /** 成员节点归属的分组 id（仅分组内成员设置）*/
    groupId?: string;
    /** 分组是否折叠（仅 group 节点）*/
    collapsed?: boolean;
    /** 分组内成员数（仅 group 节点）*/
    count?: number;
    /** 分组包围盒尺寸（仅 group 节点）*/
    dimensions?: { w: number; h: number };
  };
  [key: string]: unknown;
}

export interface StudioNode {
  id: string;
  type: "studio" | "group";
  position: { x: number; y: number };
  data: StudioNodeData;
  zIndex?: number;
  hidden?: boolean;
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
  /** 上游参考图（素材/角色图）→ 图生图一致性 */
  initImage?: string;
}
