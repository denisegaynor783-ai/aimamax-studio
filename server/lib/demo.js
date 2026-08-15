// 后端 Demo 引擎：无密钥时返回占位结果（与前端 demo 风格一致，零额度）
function svg(title, sub, kind) {
  const w = kind === "video" ? 480 : 512;
  const h = kind === "video" ? 270 : 640;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#0a0a0e"/>
  <rect width="${w}" height="${h}" fill="#16101c"/>
  <circle cx="${w / 2}" cy="${kind === "video" ? 135 : 240}" r="56" fill="none" stroke="#ff6b1a" stroke-width="2"/>
  <path d="M${w / 2 - 16} ${kind === "video" ? 113 : 218} L${w / 2 + 18} ${kind === "video" ? 135 : 240} L${w / 2 - 16} ${kind === "video" ? 157 : 262} Z" fill="#ff6b1a"/>
  <text x="${w / 2}" y="${h - 60}" text-anchor="middle" font-family="monospace" font-size="14" fill="#ededf2">AIMAMAX · DEMO</text>
  <text x="${w / 2}" y="${h - 36}" text-anchor="middle" font-family="monospace" font-size="12" fill="#ff8a3d">${(sub || "").slice(0, 28)}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function demoText(prompt) {
  return `【AIMAMAX 导演台 · Demo 脚本（后端占位）】

主题：${prompt || "（未提供主题）"}

— 场景 01 —
[外景·黄昏·雨] 镜头缓缓推近，主角立于天台边缘，城市的霓虹在身后化开成色块。
画外音：有些决定，只能在没有退路的那一刻才看得清。

— 场景 02 —
[内景·深夜·工作室] 屏幕冷光映在脸上，时间被一格格分镜切分。
台词：再改最后一版，就让它出场。

（配置 ToAPIs 密钥后，将由所选大模型产出正式内容。）`;
}

function demoGenerate(kind, prompt) {
  if (kind === "text") return { status: "success", text: demoText(prompt), demo: true };
  if (kind === "video") return { status: "success", url: svg(prompt, "DEMO REEL", "video"), demo: true };
  return { status: "success", url: svg(prompt, "DEMO POSTER", "image"), demo: true };
}

module.exports = { demoGenerate };
