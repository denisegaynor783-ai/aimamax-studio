// ============================================================
// AIMAMAX Studio — 专业 Agent 调用层
// 目录镜像后端 lib/agents.js；无后端时本地 Demo 回退。
// ============================================================
import type { AppSettings } from "./types";
import { getToken } from "./auth";

// ——— Hell Grind 院线级方法论（镜像后端 lib/agents.js） ———
export const CINEMATIC_FOUNDATION: string[] = [
  "Style: 8K IMAX. Photorealistic — no 3D render, no game engine, no game-cutscene aesthetic.",
  "Cinematography: Emmanuel Lubezki × Roger Deakins.",
  "Camera: Physical cine lens. 180° shutter motion blur.",
  "Lighting: Natural light only — contre-jour backlight, camera on shadow side, atmospheric haze throughout. Key light from sky and windows only.",
  "Color: 60:30:10 — dominant / secondary / accent.",
  "Skin: Pore-level realism — vellus hair, asymmetric moles, capillary flush, pore-shadow matching on-set light.",
  "Physics: Gravity and inertia respected — mass has real weight, correct contact shadows. No floating props.",
  "Acting: Hollywood — micro-pauses before reactions, precise eye-line, wet living eyes with catch-lights, visible breath and chest rise.",
  "Composition: Rule of thirds + golden ratio. Every person moving from frame one.",
  "Continuity: Characters, props, environment identical across every cut. No identity drift.",
  "Technical: 24fps smooth motion. 8K detail. No jitter.",
  "Audio: Environmental SFX only. No music. No subtitles.",
];

export interface SkeletonSection { key: string; label: string; weight: string; desc: string; }
export const SHOT_SKELETON: SkeletonSection[] = [
  { key: "state", label: "① 角色当前状态", weight: "最高频", desc: "当前伤势、衣物破损处、面部表情 — 模型无记忆，必须逐镜重述" },
  { key: "scene", label: "② 场景：承接上一镜", weight: "34%", desc: "本镜从上一镜的什么状态接上" },
  { key: "intent", label: "③ 本镜主旨", weight: "16%", desc: "导演意图，给模型一个锚点" },
  { key: "geometry", label: "④ GEOMETRY 站位", weight: "37%", desc: "谁在何处、距离、方向（GEO 空间锚点）" },
  { key: "dialogue", label: "⑤ 台词与音效", weight: "36%", desc: "即便默片也要写风声与脚步" },
  { key: "action", label: "⑥ ACTION + 6 拍", weight: "48%", desc: "15 秒拆 6 拍，每拍一句" },
  { key: "rules", label: "⑦ KEY RULES 硬规则", weight: "33%", desc: "必须有什么、绝不可出现什么" },
];

export interface CineConstraint { key: string; label: string; desc: string; }
export const CINE_CONSTRAINTS: CineConstraint[] = [
  { key: "corner", label: "用角落不用整屋", desc: "「祭坛旁角落」而非「整个大厅」" },
  { key: "anchor", label: "锚点绑走位", desc: "用柱子/沙发/祭坛等锚点锁定人物位置" },
  { key: "one-action", label: "一镜一动作", desc: "复杂动作拆镜，不在镜头中途炸开" },
  { key: "crowd-count", label: "人群标人数", desc: "必须写「20+人」，否则模型随机漂移" },
  { key: "axis-180", label: "180° 轴线", desc: "摄像机永不越过轴线，避免跳轴" },
  { key: "scale-anchor", label: "尺度锚点", desc: "巨人/巨物每镜写尺度参照，防偷偷缩小" },
  { key: "furniture-ban", label: "家具禁令", desc: "列出本镜绝不可出现的家具/道具" },
  { key: "geo-anchor", label: "GEO 空间模块", desc: "场景空间布局逐镜原样粘贴" },
];

export interface AgentMeta {
  id: string;
  name: string;
  category: string;
  icon: string; // 映射到 icons.tsx 的图标 key
  tagline: string;
}

export const CATEGORIES = [
  "提示词工程",
  "剧本创意",
  "分镜",
  "视觉美术",
  "摄影运镜",
  "视频动态",
  "音频配乐",
  "运营投放",
];

// 与后端 lib/agents.js 保持一致的展示信息（不含 system）
export const AGENTS: AgentMeta[] = [
  { id: "prompt-master", name: "专业提示词工程师", category: "提示词工程", icon: "spark", tagline: "把模糊想法转成图像/视频生成的专业结构化提示词" },
  { id: "prompt-doctor", name: "提示词诊断优化师", category: "提示词工程", icon: "spark", tagline: "反向：诊断并增强你已有的提示词" },
  { id: "cine-prompt", name: "电影级提示词装配师", category: "提示词工程", icon: "filmstrip", tagline: "Hell Grind 院线级：7 段骨架 + 12 行底座 + 约束，一键拼装成片提示词" },
  { id: "screenwriter", name: "编剧/故事架构师", category: "剧本创意", icon: "script", tagline: "三幕结构、人物弧光、可拍的分场剧本" },
  { id: "narrative", name: "世界观/叙事设计师", category: "剧本创意", icon: "script", tagline: "世界观设定、主线钩子、情绪节奏" },
  { id: "storyboard", name: "分镜导演", category: "分镜", icon: "filmstrip", tagline: "把剧本拆成镜头表（景别/机位/运动/时长）" },
  { id: "comic-board", name: "漫剧分镜师", category: "分镜", icon: "filmstrip", tagline: "动态漫画分格脚本（格数/视角/情绪/转场）" },
  { id: "visual-director", name: "视觉风格总监", category: "视觉美术", icon: "image", tagline: "整体美术基调、色彩脚本、风格参考" },
  { id: "character-designer", name: "角色设计师", category: "视觉美术", icon: "character", tagline: "角色外观设定卡 + 一致性锁 prompt" },
  { id: "cinematographer", name: "摄影指导", category: "摄影运镜", icon: "video", tagline: "镜头语言、光位、焦段、胶片质感" },
  { id: "camera-move", name: "运镜/动态导演", category: "摄影运镜", icon: "video", tagline: "推拉摇移跟升降、速度曲线、转场" },
  { id: "motion-director", name: "动态导演（视频生成）", category: "视频动态", icon: "video", tagline: "视频生成参数、动作连贯性、时长建议" },
  { id: "vfx-3d", name: "3D/特效资产师", category: "视频动态", icon: "cube", tagline: "3D 模型/特效/合成提示词" },
  { id: "sound-designer", name: "配乐/音效设计师", category: "音频配乐", icon: "music", tagline: "BGM 风格、情绪曲线、SFX 清单、歌词" },
  { id: "growth-copy", name: "爆款文案/标题策划", category: "运营投放", icon: "text", tagline: "短视频标题、钩子、简介、话题标签" },
  { id: "localizer", name: "本地化/翻译师", category: "运营投放", icon: "text", tagline: "多语种剧本与口播本地化、文化适配" },
];

export function getAgent(id: string): AgentMeta | undefined {
  return AGENTS.find((a) => a.id === id);
}

/** 从后端拉取最新目录（可选；失败回退本地 AGENTS） */
export async function fetchAgents(apiBase: string): Promise<AgentMeta[]> {
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/agents`);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const j = await res.json();
  return j.agents as AgentMeta[];
}

/** 运行 Agent：有后端走 /api/v1/agent，否则本地 Demo 回退 */
export async function runAgent(
  agentId: string,
  prompt: string,
  settings: AppSettings,
  model?: string
): Promise<{ text: string; demo: boolean; name?: string; model?: string }> {
  const apiBase = settings.apiBase?.trim();
  if (apiBase) {
    try {
      const token = getToken();
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ agent: agentId, prompt, model }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      return { text: j.text, demo: !!j.demo, name: j.name, model: j.model };
    } catch {
      return { text: localDemo(agentId, prompt), demo: true };
    }
  }
  return { text: localDemo(agentId, prompt), demo: true };
}

// —— 离线 Demo（镜像后端 demoAgent，保证无后端也可用） ——
function localDemo(agentId: string, prompt: string): string {
  const p = (prompt || "").trim() || "（请描述你的创意 / 主题）";
  if (agentId === "cine-prompt") {
    const lines = p.split(/[。\n]/).map((s) => s.trim()).filter(Boolean);
    const subject = lines[0] || p;
    const beat = (n: number, d: string) => `  拍${n}：${d}`;
    return (
`【电影级提示词装配师 · Demo 装配（Hell Grind 语法）】
—— 7 段镜头骨架 ——
① 角色当前状态：${subject}（伤势/衣物/表情逐镜重述：模型无记忆，每次必写）
② 场景承接：本镜从上一镜的（状态）接上
③ 本镜主旨：${p}
④ GEOMETRY 站位：主体位于画面（中右/中左），距摄像机（X 米），方向（朝向/背向），锚点（柱子/祭坛）
⑤ 台词与音效：默片也写风声/脚步/布料摩擦；如说话给出精确台词
⑥ ACTION 6 拍（15 秒）：
${beat(1, "（起始静态，微动态：呼吸起伏）")}
${beat(2, "（动作起势）")}
${beat(3, "（动作发展）")}
${beat(4, "（高潮动作）")}
${beat(5, "（余势）")}
${beat(6, "（收束定格）")}
⑦ KEY RULES 硬规则：必须出现（X）/ 绝不可出现（Y、多余人物、家具漂移）

—— 12 行技术底座（逐字粘贴）——
${CINEMATIC_FOUNDATION.join("\n")}

（Demo 离线占位：配置 api.ninedeerselect.com + TOAPIS_KEY 后，由大模型按此语法实时装配并写入你的风格。）`
    );
  }
  if (agentId === "prompt-master") {
    return (
      `【专业提示词 · 专业提示词工程师】\n` +
      `主体：${p}\n` +
      `场景/环境：（黄昏城市天台，霓虹湿漉，电影感）\n` +
      `光影：（侧逆光，体积光，冷暖对比）\n` +
      `镜头/构图：（中近景，低角度，浅景深 f/1.8）\n` +
      `风格参考：（cinematic, teal & orange, 35mm film grain, directed by Roger Deakins）\n` +
      `画质词：（8k, ultra-detailed, photorealistic, masterpiece）\n` +
      `— 即梦/可灵友好版 —\n` +
      `${p}，电影感，黄昏城市，侧逆光，浅景深，8k 超清，大师光影\n` +
      `— Negative —\n` +
      `模糊、畸形、多余手指、文字水印、低分辨率\n` +
      `（Demo 离线占位：在「设置 → API 网关」配置 api.ninedeerselect.com 后，由所选大模型实时生成正式提示词）`
    );
  }
  const a = getAgent(agentId);
  const tag = a?.tagline || "";
  return (
    `【${a?.name || agentId} · Demo 输出】\n` +
    `需求：${p}\n\n` +
    `（以下为离线占位结构，配置真实 API 后由本 Agent 产出专业内容）\n\n` +
    `▍专业建议骨架\n` +
    `1. 目标对齐：${tag}\n` +
    `2. 输入解析：围绕「${p}」展开\n` +
    `3. 产出结构：按本 Agent 专业范式组织\n` +
    `4. 可交付：可直接用于后续生成 / 制作环节\n\n` +
    `（Demo 模式：配置 api.ninedeerselect.com 后，即由所选大模型实时生成。）`
  );
}

// —— 电影级基座：结构化装配（离线，供 cine-prompt 表单与「注入基座」用） ——
export interface CineShotInput {
  state?: string;     // ① 角色当前状态
  scene?: string;     // ② 场景承接
  intent?: string;    // ③ 本镜主旨
  geometry?: string;  // ④ GEOMETRY 站位
  dialogue?: string;  // ⑤ 台词与音效
  action?: string;    // ⑥ ACTION（多行，每行一拍）
  rules?: string;     // ⑦ KEY RULES 硬规则
}
export interface CineBuildOpts {
  withFoundation?: boolean;       // 末尾附 12 行底座
  constraints?: string[];         // 启用的约束 key
  language?: "zh" | "en";
}

export function buildCinePrompt(input: CineShotInput, opts: CineBuildOpts = {}): string {
  const en = opts.language === "en";
  const sec = (n: string, label: string, val?: string) =>
    val && val.trim() ? `${n} ${label}：${val.trim()}\n` : "";
  const beats = (input.action || "")
    .split(/[\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  let body = "";
  body += sec("①", en ? "CHARACTER CURRENT STATE" : "角色当前状态", input.state);
  body += sec("②", en ? "SCENE: continuation" : "场景：承接上一镜", input.scene);
  body += sec("③", en ? "WHAT THIS SHOT IS ABOUT" : "本镜主旨", input.intent);
  body += sec("④", en ? "GEOMETRY: staging" : "GEOMETRY 站位", input.geometry);
  body += sec("⑤", en ? "DIALOGUE & SFX" : "台词与音效", input.dialogue);
  if (beats.length) {
    body += `⑥ ${en ? "ACTION (beats)" : "ACTION 6 拍"}：\n`;
    beats.forEach((b, i) => (body += `  拍${i + 1}：${b}\n`));
  }
  body += sec("⑦", en ? "KEY RULES" : "KEY RULES 硬规则", input.rules);

  let constraints = "";
  const active = (opts.constraints || []).map(
    (k) => CINE_CONSTRAINTS.find((c) => c.key === k)?.label
  ).filter(Boolean) as string[];
  if (active.length) {
    constraints = `\n— 约束（给模型更少自由） —\n${active.map((l) => "• " + l).join("\n")}\n`;
  }
  const foundation = opts.withFoundation !== false ? `\n${CINEMATIC_FOUNDATION.join("\n")}\n` : "";
  return (body + constraints + foundation).trim() + "\n";
}
