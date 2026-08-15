// ToAPIs 客户端：OpenAI 兼容网关（https://toapis.com/v1）
// 文本：/chat/completions  图像：/images/generations  视频：/videos/generations（异步 + /tasks 轮询）
const { TOAPIS_BASE, TOAPIS_KEY } = require("./config");

const SYS = "你是 AIMAMAX 导演台的 AI 编剧/分镜/视觉助手，输出专业、可直接用于影视/漫剧制作的内容。";

async function chat(model, prompt) {
  const r = await fetch(`${TOAPIS_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOAPIS_KEY}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYS },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
    }),
  });
  if (!r.ok) throw new Error(`chat HTTP ${r.status}`);
  const j = await r.json();
  const text = j?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("empty completion");
  return text;
}

async function image(model, prompt, size) {
  const r = await fetch(`${TOAPIS_BASE}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOAPIS_KEY}` },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: size || "1024x1024",
      response_format: "url",
    }),
  });
  if (!r.ok) throw new Error(`image HTTP ${r.status}`);
  const j = await r.json();
  const url = j?.data?.[0]?.url || j?.url;
  if (!url) throw new Error("image response missing url");
  return url;
}

async function video(model, prompt, opts) {
  const r = await fetch(`${TOAPIS_BASE}/videos/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOAPIS_KEY}` },
    body: JSON.stringify({
      model,
      prompt,
      duration: opts?.duration || 10,
      aspect_ratio: opts?.aspectRatio || "16:9",
    }),
  });
  if (!r.ok) throw new Error(`video HTTP ${r.status}`);
  const j = await r.json();
  const taskId = j?.id || j?.task_id || j?.data?.id;
  if (!taskId) throw new Error("video response missing task id");

  // 轮询任务状态（最多约 2 分钟）
  for (let i = 0; i < 40; i++) {
    await new Promise((res) => setTimeout(res, 3000));
    let s;
    try {
      const t = await fetch(`${TOAPIS_BASE}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${TOAPIS_KEY}` },
      });
      if (!t.ok) continue;
      s = await t.json();
    } catch {
      continue;
    }
    const st = s?.status || s?.data?.status;
    if (st === "succeeded" || st === "completed" || st === "success") {
      const url =
        s?.video_url || s?.url || s?.data?.video_url || s?.result?.url || s?.data?.result?.url;
      if (url) return url;
    }
    if (st === "failed" || st === "error") throw new Error("video task failed");
  }
  throw new Error("video task timeout");
}

// ToAPIs 全模型目录（静态精选；密钥就绪时可叠加 /v1/models 拉取）
function catalog() {
  return {
    text: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5.5",
      "gpt-5.6-sol",
      "claude-3.5-sonnet",
      "gemini-2.5-flash",
      "deepseek-v3",
    ],
    image: ["gpt-4o-image", "gpt-image-2", "gemini-image", "flux-1.1", "seedream-3-0"],
    video: ["sora-2", "veo-3", "kling", "hunyuan-video"],
  };
}

module.exports = { chat, image, video, catalog };
