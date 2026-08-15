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
export interface FewShotMeta { corpusSize: number; used: string[]; }
export async function runAgent(
  agentId: string,
  prompt: string,
  settings: AppSettings,
  model?: string
): Promise<{ text: string; demo: boolean; name?: string; model?: string; fewShot?: FewShotMeta }> {
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
      return { text: j.text, demo: !!j.demo, name: j.name, model: j.model, fewShot: j.fewShot };
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

// ——— 中文电影提示词 Few-Shot 范例（镜像后端 lib/prompt-corpus.js 种子集） ———
// 诚实声明：由 AIMAMAX 团队依据 Higgsfield《Hell Grind》公开方法论（7 段骨架 + 12 行底座 + 8 约束）
// 手工构建的高质量示范，并非 Hell Grind 原片逐字提示词。真实 4,561 条导出后由后端加载。
export interface ZhFewShot { input: string; tags: string[]; output: string; }
export const ZH_FEWSHOT_SEED: ZhFewShot[] = [
  {
    input: "雨夜天台，女主独白",
    tags: ["雨", "夜", "天台", "城市", "独白", "情绪", "女主", "湿身", "霓虹"],
    output:
`【① 角色当前状态】LULU（甜辣少女态）：黑色短发被雨水打湿贴脸颊，白色风衣浸水变半透，肩头水珠滑落，嘴唇因寒冷微紫，眼神疲惫却倔强。
【② 场景承接】接上一镜：她刚从楼梯间冲上天台，防火门在身后半开，城市霓虹在雨幕中晕成色块。
【③ 本镜主旨】独白前的最后停顿——城市在她脚下，她不属于这里却必须留下。
【④ GEOMETRY 站位】LULU 站天台东侧护栏边距栏 0.5 米；摄像机在其左前 3 米、机位略低于眼线；远处金融塔群占画面右侧 1/3。
【⑤ 台词音效】风声贯穿，雨打铁皮顶棚细碎声；独白仅一句："我以为逃到这里就自由了。"
【⑥ ACTION 6 拍】0-2s 扶护栏指节发白；2-4s 低头看脚下城市雨水从发梢滴落；4-6s 深吸气胸口明显起伏；6-9s 抬眼望塔群眼神收紧；9-12s 嘴角扯出苦笑未说话。
【⑦ KEY RULES】必须：湿发贴脸、风衣半透、霓虹冷光打右脸；绝不可：阳光、室内光、第二人、微笑以外表情。`,
  },
  {
    input: "废弃训练室，两人对峙",
    tags: ["室内", "对峙", "动作", "训练室", "群像", "近景", "灯光", "空间地图"],
    output:
`【① 角色当前状态】ROKO（普通态）：运动背心被汗浸透贴脊背，左眉骨一道新伤渗血，呼吸粗重；对手 JAXX 双手垂放、指节绷白，无明显伤。
【② 场景承接】接上一镜：圆形训练垫位于房间中央，房门在画面左侧远墙距垫 8 米，长椅距垫 2 米。
【③ 本镜主旨】对峙的临界点，谁先动谁就输。
【④ GEOMETRY 站位】ROKO 在垫东缘，JAXX 在垫西缘，两人相距 2.4 米；摄像机停在房门一侧不越轴；五个损坏人偶散落画面右侧。
【⑤ 台词音效】只有两人脚步摩擦地胶与沉重呼吸；无台词。
【⑥ ACTION 6 拍】0-1s 房间静止人偶仍微晃；1-3s ROKO 重心下沉膝微屈；3-5s JAXX 喉结滚动咽一下；5-8s ROKO 先移半步左脚踩实；8-12s 两人同时绷紧肩线目光锁死。
【⑦ KEY RULES】必须：轴线不越、垫子居中、人偶在右；绝不可：第三人入画、镜头越轴、家具增多。`,
  },
  {
    input: "博物馆展厅，四少年发现无名文物",
    tags: ["博物馆", "室内", "群像", "奇观", "发现", "夜", "文物", "空间地图"],
    output:
`【① 角色当前状态】四少年（ROKO/JAXX/LULU/REIN）均"普通态"：LULU 耳机挂颈、REIN 卫衣兜帽半戴、JAXX 手指沾灰、ROKO 运动鞋带松。
【② 场景承接】接开场全景：展厅高 9 米，中央玻璃展台距北墙 6 米，两排古希腊石柱在左右各 4 根。
【③ 本镜主旨】文物无标签无历史——触碰即改变一切。
【④ GEOMETRY 站位】四人围展台半圈，ROKO 最近距台 0.4 米，其余依次外扩；摄像机从展台斜上 45° 俯拍，石柱作画框。
【⑤ 台词音效】远处空调低频嗡鸣，脚步在石材地面回响；REIN 轻声："这上面……什么都没写。"
【⑥ ACTION 6 拍】0-2s 四人缓步靠近展台；2-4s LULU 伸手欲触又缩回；4-6s ROKO 指尖轻碰玻璃罩；6-9s 罩内文物泛起微光；9-12s 四人瞳孔同时收缩后退半步。
【⑦ KEY RULES】必须：石柱画框、展台居中、文物微光；绝不可：阳光、现代灯牌、游客群、文物具名。`,
  },
  {
    input: "小巷追逐，雨中奔跑",
    tags: ["雨", "夜", "追逐", "动作", "街头", "跑步", "手持", "城市"],
    output:
`【① 角色当前状态】REIN（淋雨态 _wet）：兜帽脱落露出湿发，卫衣吸水变深，喘气时白雾从口鼻溢出，右脚鞋底打滑一次。
【② 场景承接】接上一镜：窄巷宽 1.8 米，两侧砖墙高 4 米，唯一光源是巷尾便利店冷白灯。
【③ 本镜主旨】被未知之物追赶，只能向前。
【④ GEOMETRY 站位】REIN 从画面纵深冲向镜头，巷尾灯在其背后；摄像机手持跟拍在其右肩后 1.5 米。
【⑤ 台词音效】雨声、踩水花、远处警笛由远及近；无台词。
【⑥ ACTION 6 拍】0-2s 转身加速水花溅起；2-4s 手撑右墙借力拐弯；4-6s 脚下一滑单手扶墙；6-9s 抬头看巷尾光呼吸崩；9-12s 冲出巷口逆光剪影。
【⑦ KEY RULES】必须：手持晃动、逆光剪影、单光源；绝不可：第三人、稳定长镜、晴天。`,
  },
  {
    input: "医院走廊，受伤角色被推过",
    tags: ["室内", "医院", "受伤", "状态", "横移", "灯光", "情绪", "血"],
    output:
`【① 角色当前状态】JAXX（受伤态 _blood）：左腹绷带渗暗红，脸色灰白唇无血色，手指死死抓床沿指节发白，眼神涣散。
【② 场景承接】接上一镜：走廊长 20 米荧光灯惨白，右侧病房门等距 6 扇，尽头双开急救门。
【③ 本镜主旨】在生死之间被推移，时间被拉长。
【④ GEOMETRY 站位】病床居中沿走廊中轴推进，摄像机与床同速横移在其左侧 2 米；病房门在画面右侧规律后退。
【⑤ 台词音效】轮床橡胶轮碾地、心电监护短促嘀声、远处护士呼叫；无台词。
【⑥ ACTION 6 拍】0-3s 床匀速推进门规律后退；3-5s JAXX 手指松开又攥紧；5-8s 监护嘀声变快；8-10s 他侧头看天花板上晃的光；10-12s 眼皮沉重半阖。
【⑦ KEY RULES】必须：惨白荧光、绷带渗血、横移同速；绝不可：亲属哭喊、血泊、暖光。`,
  },
  {
    input: "巨物降临，城市人群仰视",
    tags: ["巨物", "尺度锚点", "群像", "城市", "奇观", "全景", "震撼"],
    output:
`【① 角色当前状态】20+ 群众（普通态）：统一仰头、手机举起、嘴微张，无人交谈，服装色彩压暗。
【② 场景承接】接上一镜：中央广场宽 80 米，参照物为 6 层百货楼（高约 24 米）与路灯（高 10 米）。
【③ 本镜主旨】尺度锚定——未知巨人高于百货楼两倍。
【④ GEOMETRY 站位】巨人立于广场北端，足跟距百货楼 30 米，头顶超出楼顶约 24 米；群众散在广场南半，最近距巨人脚 15 米；摄像机低位仰拍。
【⑤ 台词音效】集体倒吸气的风声、手机快门连响；无人说话。
【⑥ ACTION 6 拍】0-2s 群众集体后仰一步；2-4s 巨人抬脚阴影笼罩半场；4-7s 落叶与碎纸被气压掀起；7-9s 前排有人跌坐；9-12s 巨人俯视镜头眼无光。
【⑦ KEY RULES】必须：百货楼作尺度参照、群众标 20+、低位仰拍；绝不可：巨人缩小、镜头平视、空场。`,
  },
  {
    input: "童年闪回，厨房暖光",
    tags: ["闪回", "室内", "暖光", "童年", "情绪", "母亲", "慢镜", "怀旧"],
    output:
`【① 角色当前状态】LULU（童年态）：约 8 岁，双马尾，棉睡衣小熊图案，赤脚踩凉地砖，手里攥半块面包。
【② 场景承接】非现实闪回：老式厨房，窗台一盆薄荷，暖黄吊灯在桌上方。
【③ 本镜主旨】母亲还在时的最后一个平静早晨。
【④ GEOMETRY 站位】LULU 在餐桌左侧椅上晃脚，母亲在右侧灶台背身；摄像机固定中景在正前方 4 米。
【⑤ 台词音效】油锅轻滋、远处电车铃；母亲哼无名调，无清晰词。
【⑥ ACTION 6 拍】0-3s LULU 晃脚看窗外；3-5s 母亲回头笑一下继续翻蛋；5-8s 她把面包掰一半推过去；8-10s LULU 接住笑；10-12s 画面泛白转场。
【⑦ KEY RULES】必须：暖黄吊灯、薄荷窗台、慢镜 48fps；绝不可：冷光、成人 LULU、手机。`,
  },
  {
    input: "无对白环境，黎明海边",
    tags: ["无对白", "环境", "黎明", "海", "空镜", "自然光", "舒缓", "建立空间"],
    output:
`【① 角色当前状态】无人；海面灰蓝，浪线均匀，远处一艘渔船静止如剪影。
【② 场景承接】全片首个空镜，建立世界：东天鱼肚白，云层水平铺开。
【③ 本镜主旨】暴风雨前的寂静，世界尚且完整。
【④ GEOMETRY 站位】摄像机固定低位贴浪线，地平线居画面下 1/3；渔船在右侧 1/3 远处。
【⑤ 台词音效】仅海浪白噪与远处海鸟两声；无台词无音乐。
【⑥ ACTION 6 拍】0-3s 浪退沙现；3-6s 微风掠过草尖；6-9s 天际线由灰转橙；9-12s 渔船缓缓调头。
【⑦ KEY RULES】必须：自然光、无人物、水平构图；绝不可：对白、音乐、人造光。`,
  },
  {
    input: "酒吧夜谈，双人近景",
    tags: ["夜", "室内", "对话", "近景", "酒吧", "情绪", "灯光", "双人"],
    output:
`【① 角色当前状态】ROKO（普通态）：坐在吧台高脚凳，手转空杯，眼下青黑；对面的神秘人戴鸭舌帽帽檐压眼。
【② 场景承接】接上一镜：酒吧深 12 米，唯一暖光来自吧台吊灯，其余沉入暗，墙面酒架虚化。
【③ 本镜主旨】一笔交易，两不相欠。
【④ GEOMETRY 站位】两人肩并肩坐吧台，ROKO 在左神秘人在右相距 0.6 米；摄像机过肩拍神秘人侧脸背光，ROKO 正脸受暖光。
【⑤ 台词音效】冰杯轻碰、远处爵士低音；神秘人："东西我拿了，你别问从哪来。"
【⑥ ACTION 6 拍】0-2s ROKO 转杯停；2-4s 抬眼盯对方帽檐；4-7s 神秘人推过一物入画；7-9s ROKO 手指触物又收；9-12s 两人沉默对视呼吸同步。
【⑦ KEY RULES】必须：吧台暖光、过肩构图、帽檐压眼；绝不可：全场亮、第三人、笑。`,
  },
  {
    input: "战斗爆发，超能力初现",
    tags: ["动作", "特效", "超能力", "战斗", "夜", "室内", "爆发", "奇观"],
    output:
`【① 角色当前状态】REIN（觉醒态）：掌心浮起蓝白电弧，瞳孔映光，汗沿太阳穴流下，衣物被冲击波吹动。
【② 场景承接】接对峙镜：训练室垫子被气浪掀起，人偶飞散画面右侧。
【③ 本镜主旨】力量第一次失控地挣脱身体。
【④ GEOMETRY 站位】REIN 在垫中央，电弧半径 1.2 米；摄像机环绕 120° 从低到稍高；JAXX 在画面左缘被气浪逼退。
【⑤ 台词音效】低频轰鸣、电弧噼啪、玻璃碎裂；REIN 低吼一声无词。
【⑥ ACTION 6 拍】0-2s 掌心光点凝聚；2-4s 光沿臂脉蔓延；4-6s 地面尘屑悬浮；6-9s 冲击波炸开人偶飞散；9-12s REIN 跪地喘息光散。
【⑦ KEY RULES】必须：蓝白电弧、环绕运镜、尘屑悬浮；绝不可：火焰替代、镜头静止、第三人介入。`,
  },
  {
    input: "车内对话，雨刷节奏",
    tags: ["车内", "夜", "雨", "对话", "近景", "封闭空间", "情绪", "双人"],
    output:
`【① 角色当前状态】LULU（淋雨态 _wet 转干）：发尾仍滴水温巾敷额，安全带勒肩，目光游离窗外；驾驶座 JAXX 沉默握盘。
【② 场景承接】接追逐镜：旧 SUV 停巷口，雨刷每 3 秒一次，窗外霓虹流成彩线。
【③ 本镜主旨】逃出生天后，谁也不敢先说破。
【④ GEOMETRY 站位】摄像机固定后座中轴拍前排两人后脑与侧脸；雨刷在画面上缘规律切过。
【⑤ 台词音效】雨刷节律、引擎怠速、电台杂音；LULU："我们……刚才碰到的到底是什么？"
【⑥ ACTION 6 拍】0-3s 雨刷切过两人沉默；3-5s JAXX 握盘指节白；5-8s LULU 转头看他侧脸；8-10s 他未答眨眼；10-12s 电台突然插播警报两人同时僵。
【⑦ KEY RULES】必须：雨刷节律、后座中轴、霓虹流线；绝不可：车外全景、阳光、第三人。`,
  },
  {
    input: "楼梯间攀爬，手持上升",
    tags: ["室内", "动作", "楼梯", "手持", "运动", "夜", "紧张", "上升"],
    output:
`【① 角色当前状态】ROKO（普通态）：三步并两步喘气，左手扶栏右手攥手机亮屏照路，鞋跟在铁阶回响。
【② 场景承接】接天台镜前：消防楼梯宽 1.2 米，铁栏锈迹，唯一光来自每层窗缝月白。
【③ 本镜主旨】向上的逃路，也是绝路。
【④ GEOMETRY 站位】ROKO 从下往上，摄像机手持在其身后 1 米随阶上升；铁栏在画面左右交替框边。
【⑤ 台词音效】金属阶回响、喘息、远处门响；无台词。
【⑥ ACTION 6 拍】0-3s 转身冲上两阶；3-5s 手机滑落险接住；5-8s 扶栏喘定抬头；8-10s 顶层门缝透风；10-12s 他推门光涌出。
【⑦ KEY RULES】必须：手持上升、月白窗缝、铁栏框边；绝不可：稳定轨、暖光、第二人。`,
  },
  {
    input: "祭坛角落，低光仪式",
    tags: ["室内", "低光", "角落", "仪式", "神秘", "锚点", "夜", "道具"],
    output:
`【① 角色当前状态】无名祭司（兜帽态）：跪于角落石坛前，手持烛火映半脸，另一半沉黑，唇动无声。
【② 场景承接】接展厅镜：祭坛位于大厅东北角（非整厅），一根石柱作锚点距坛 1 米，墙上裂痕竖向。
【③ 本镜主旨】唤醒不该被唤醒的存在。
【④ GEOMETRY 站位】祭司在画面左下角占 1/4，石柱在右侧作锚，烛火为唯一光源；摄像机固定微俯。
【⑤ 台词音效】烛火噼啪、远处石屑落；祭司念不可辨词。
【⑥ ACTION 6 拍】0-3s 烛火摇影上墙；3-5s 他抬手抚坛纹；5-8s 坛缝渗黑雾；8-10s 雾凝成眼；10-12s 祭司停唇动睁眼。
【⑦ KEY RULES】必须：角落非整厅、石柱锚点、单烛光源；绝不可：全场亮、第二人、现代物。`,
  },
  {
    input: "黎明街头，四人背身远去",
    tags: ["黎明", "街头", "群像", "结局", "远景", "舒缓", "城市", "收束"],
    output:
`【① 角色当前状态】四少年（普通态）：衣衫褴褛但站直，LULU 牵 REIN 手，ROKO 护右肩伤，JAXX 回头最后一次。
【② 场景承接】接战斗镜后：城市黎明，街道空旷，远处天台仍在冒烟。
【③ 本镜主旨】他们成了世界最后一道防线，却也只是四个孩子。
【④ GEOMETRY 站位】四人背身居中偏下沿街远去，摄像机固定远景在他们后上方 30 米；朝阳在画面左侧。
【⑤ 台词音效】晨风、远处车声渐起；无台词。
【⑥ ACTION 6 拍】0-3s 四人同步迈步；3-6s JAXX 回头望烟；6-9s LULU 握紧手继续；9-12s 四人渐缩成点朝阳升起。
【⑦ KEY RULES】必须：远景背身、朝阳左侧、空街；绝不可：特写、对白、暖室。`,
  },
];
