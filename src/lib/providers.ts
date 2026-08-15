// ============================================================
// AIMAMAX Studio — AI 供应商抽象
// 统一接口：OpenAI 兼容 / ToAPIs / 火山方舟 + Demo 回退。
// 真实调用走 OpenAI 兼容端点；未配密钥或开启 Demo 时回退到离线占位，
// 保证「画布永远能跑通生成闭环」，用户配好密钥即切真模型。
// ============================================================
import type { AppSettings, GenRequest, GenResult, ProviderConfig, ProviderKind } from "./types";
import { uid } from "./db";

/** 各供应商默认 baseUrl（用户可在设置页覆盖） */
export const PROVIDER_PRESETS: Record<ProviderKind, { baseUrl: string; label: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", label: "OpenAI" },
  toapis: { baseUrl: "https://api.toapis.com/v1", label: "ToAPIs" },
  volcengine: { baseUrl: "https://ark.cn-beijing.volces.com/api/v3", label: "火山方舟" },
  demo: { baseUrl: "", label: "Demo 离线引擎" },
};

export function defaultProviders(): ProviderConfig[] {
  return (["toapis", "volcengine", "openai", "demo"] as ProviderKind[]).map((kind) => ({
    id: kind,
    kind,
    name: PROVIDER_PRESETS[kind].label,
    baseUrl: PROVIDER_PRESETS[kind].baseUrl,
    apiKey: "",
    models: DEFAULT_MODELS[kind],
    enabled: kind === "demo",
  }));
}

export const DEFAULT_MODELS: Record<ProviderKind, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "dall-e-3", "sora"],
  toapis: ["toapis-text", "toapis-image", "toapis-video"],
  volcengine: ["doubao-seed-1-6", "doubao-vision", "seedream-3-0", "cvs-video"],
  demo: ["demo-poster", "demo-reel", "demo-script"],
};

// ———————————————————————————————————————————————
// 对外唯一入口：根据 settings + 请求，产出 GenResult（Promise）
// ———————————————————————————————————————————————
export async function generate(req: GenRequest, settings: AppSettings): Promise<GenResult> {
  const base: GenResult = {
    id: uid(),
    kind: req.kind,
    status: "pending",
    model: req.model,
    provider: req.provider,
    createdAt: Date.now(),
  };

  // Demo 引擎：离线占位
  if (settings.demoMode || req.provider === "demo") {
    return demoGenerate(req, base);
  }

  const prov = settings.providers.find((p) => p.id === req.provider && p.enabled);
  if (!prov || !prov.apiKey) {
    // 无密钥时优雅回退 demo，并标注来源
    const r = await demoGenerate(req, base);
    r.provider = prov?.name ?? "未配置密钥";
    r.error = "未配置有效密钥，已回退 Demo 占位";
    return r;
  }

  try {
    if (req.kind === "text") return await callText(prov, req, base);
    if (req.kind === "image") return await callImage(prov, req, base);
    return await callVideo(prov, req, base);
  } catch (e) {
    const r = await demoGenerate(req, base);
    r.error = `真实调用失败，已回退 Demo：${(e as Error).message}`;
    return r;
  }
}

// —— 真实调用：文本（chat/completions） ——
async function callText(prov: ProviderConfig, req: GenRequest, base: GenResult): Promise<GenResult> {
  const res = await fetch(`${prov.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.apiKey}` },
    body: JSON.stringify({
      model: req.model,
      messages: [
        { role: "system", content: "你是 AIMAMAX 导演台的 AI 编剧/分镜助手，输出专业、可直接用于影视/漫剧制作的内容。" },
        { role: "user", content: req.prompt },
      ],
      temperature: Number(req.params?.temperature ?? 0.8),
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "";
  return { ...base, status: "success", text };
}

// —— 真实调用：图像（images/generations，支持 init_image 图生图） ——
async function callImage(prov: ProviderConfig, req: GenRequest, base: GenResult): Promise<GenResult> {
  const size = (req.params?.size as string) ?? "1024x1024";
  const body: Record<string, unknown> = {
    model: req.model,
    prompt: req.prompt,
    n: 1,
    size,
    response_format: "url",
  };
  if (req.initImage) body.image = req.initImage; // 上游参考图 → 一致性
  const res = await fetch(`${prov.baseUrl.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const url = json?.data?.[0]?.url ?? "";
  if (!url) throw new Error("响应缺少 url");
  return { ...base, status: "success", url };
}

// —— 真实调用：视频（尽力而为，依赖供应商支持 OpenAI 风格 video 端点） ——
async function callVideo(prov: ProviderConfig, req: GenRequest, base: GenResult): Promise<GenResult> {
  // 多数视频 API 为「提交任务 → 轮询」模式，差异很大。
  // 这里尝试一次同步式提交；若供应商为异步，会在上层提示用户改用 Demo 或对接专用端点。
  const res = await fetch(`${prov.baseUrl.replace(/\/$/, "")}/videos/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.apiKey}` },
    body: JSON.stringify({ model: req.model, prompt: req.prompt }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const url = json?.data?.[0]?.url ?? json?.url ?? "";
  if (!url) throw new Error("响应缺少视频 url（该供应商可能为异步任务模式）");
  return { ...base, status: "success", url };
}

// ———————————————————————————————————————————————
// Demo 离线引擎：纯前端、零网络、零额度，产出可展示占位
// ———————————————————————————————————————————————
async function demoGenerate(req: GenRequest, base: GenResult): Promise<GenResult> {
  await new Promise((r) => setTimeout(r, 650 + Math.random() * 500)); // 模拟推理延迟
  if (req.kind === "text") {
    return { ...base, status: "success", text: demoScript(req.prompt) };
  }
  if (req.kind === "video") {
    return { ...base, status: "success", url: demoReel(req.prompt) };
  }
  return { ...base, status: "success", url: demoPoster(req.prompt) };
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** 生成一张「电影海报」风格占位 SVG（带标题与胶片框） */
function demoPoster(prompt: string): string {
  const title = (prompt || "未命名镜头").slice(0, 22);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="640" viewBox="0 0 512 640">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1320"/><stop offset="0.55" stop-color="#2a1a12"/><stop offset="1" stop-color="#0a0a0e"/>
    </linearGradient>
    <radialGradient id="v" cx="50%" cy="38%" r="60%">
      <stop offset="0" stop-color="#ff8a3d" stop-opacity="0.55"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="640" fill="url(#g)"/>
  <rect width="512" height="640" fill="url(#v)"/>
  <g fill="#ff6b1a" opacity="0.9">
    <circle cx="256" cy="232" r="58" fill="none" stroke="#ff6b1a" stroke-width="2"/>
    <path d="M240 206 L286 232 L240 258 Z" fill="#ff6b1a"/>
  </g>
  <rect x="40" y="40" width="432" height="560" fill="none" stroke="#ff6b1a" stroke-width="2" stroke-dasharray="2 8" opacity="0.5"/>
  <text x="256" y="440" text-anchor="middle" font-family="monospace" font-size="26" fill="#ededf2" font-weight="bold">AIMAMAX</text>
  <text x="256" y="478" text-anchor="middle" font-family="monospace" font-size="15" fill="#9b9ba8">DEMO POSTER</text>
  <text x="256" y="556" text-anchor="middle" font-family="monospace" font-size="13" fill="#ff8a3d">${escapeXml(title)}</text>
</svg>`;
  return svgDataUrl(svg);
}

/** 生成一段「动态分镜」风格占位 SVG（循环动画） */
function demoReel(prompt: string): string {
  const title = (prompt || "未命名视频").slice(0, 20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
  <rect width="480" height="270" fill="#0a0a0e"/>
  <rect width="480" height="270" fill="#100c16"/>
  <circle cx="240" cy="135" r="70" fill="none" stroke="#ff6b1a" stroke-width="2">
    <animate attributeName="r" values="60;78;60" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <path d="M222 108 L268 135 L222 162 Z" fill="#ff6b1a"/>
  <text x="240" y="232" text-anchor="middle" font-family="monospace" font-size="14" fill="#9b9ba8">DEMO REEL · ${escapeXml(title)}</text>
  <rect x="14" y="14" width="60" height="22" rx="4" fill="#ff3b30"/>
  <text x="44" y="29" text-anchor="middle" font-family="monospace" font-size="11" fill="#0a0a0e" font-weight="bold">REC</text>
</svg>`;
  return svgDataUrl(svg);
}

function demoScript(prompt: string): string {
  return `【AIMAMAX 导演台 · Demo 剧本】

主题：${prompt || "（未提供主题）"}

— 场景 01 —
[外景·黄昏·雨] 镜头缓缓推近，主角立于天台边缘，城市的霓虹在身后化开成色块。
画外音：有些决定，只能在没有退路的那一刻才看得清。

— 场景 02 —
[内景·深夜·工作室] 屏幕冷光映在脸上，时间被一格格分镜切分。
台词：再改最后一版，就让它出场。

— 场景 03 —
[蒙太奇] 角色卡 ×3 快速叠化，配乐渐起，标题卡定格。

（以上为 Demo 离线引擎生成，配置真实 API 密钥后将由所选模型产出正式内容。）`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
}
