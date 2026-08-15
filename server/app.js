// ============================================================
// AIMAMAX Studio — 后端 API（零依赖，仅用 Node 内置模块）
// 端点：
//   GET  /api/health                  健康检查（含 demo / toapis 状态）
//   GET  /api/auth/wechat/login       微信登录入口（无配置时走 Demo 回调）
//   GET  /api/auth/wechat/callback     微信 OAuth 回调（换码发 JWT）
//   POST /api/pay/create               创建支付订单（无商户号走 Demo）
//   GET  /api/pay/simulate             演示：模拟支付成功
//   POST /api/pay/notify               微信支付异步回调（验签占位）
//   GET  /api/pay/query                查询订单状态
//   POST /api/v1/generate              统一生成代理（文本/图像/视频 → ToAPIs）
//   GET  /api/v1/models                模型目录（ToAPIs 全模型）
//   GET  /api/v1/agents                专业 Agent 目录（脱敏：不含 system）
//   POST /api/v1/agent                 运行某 Agent（{agent, prompt, model?} → ToAPIs chat + 人设）
//   GET  /api/v1/characters            角色库目录（预设 + 自定义）
//   POST /api/v1/characters            创建自定义角色
// 鉴权：默认 ALLOW_ANON=1（演示/开发允许匿名）；生产设 0 强制登录。
// ============================================================
const http = require("http");
const { URL } = require("url");
const { TOAPIS_BASE, TOAPIS_KEY, DEMO_MODE, ALLOW_ANON, JWT_SECRET, FRONTEND_URL, WECHAT_APPID, WECHAT_SECRET, WXPAY_MCH_ID } = require("./lib/config");
const { signUser, verifyToken } = require("./lib/jwt");
const store = require("./lib/store");
const { demoGenerate } = require("./lib/demo");
const { chat, image, video, catalog } = require("./lib/toapis");
const { AGENTS, getAgent, demoAgent } = require("./lib/agents");
const { PRESET_CHARACTERS, listCharacters } = require("./lib/characters");
const corpus = require("./lib/prompt-corpus");

const PORT = process.env.PORT || 3000;

// —— 工具 ——
function sendJson(res, status, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...(extraHeaders || {}),
  });
  res.end(body);
}
function redirect(res, loc) {
  res.writeHead(302, {
    Location: loc,
    "Access-Control-Allow-Origin": "*",
  });
  res.end();
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}
function getUser(req) {
  if (ALLOW_ANON) return { id: "anon", name: "anon" };
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  const u = t && verifyToken(t, JWT_SECRET);
  return u || null;
}

// —— 路由 ——
async function handleGenerate(req, res) {
  const body = await readBody(req);
  const { kind, prompt, model, initImage, params } = body;
  if (!kind || !prompt) return sendJson(res, 400, { error: "kind & prompt required" });

  if (DEMO_MODE || !TOAPIS_KEY) {
    const r = demoGenerate(kind, prompt);
    r.provider = "demo";
    return sendJson(res, 200, r);
  }
  try {
    let r;
    if (kind === "text") {
      const text = await chat(model, prompt);
      r = { status: "success", text, provider: "toapis", model };
    } else if (kind === "image") {
      const url = await image(model, prompt, params && params.size);
      r = { status: "success", url, provider: "toapis", model };
    } else if (kind === "video") {
      const url = await video(model, prompt, params);
      r = { status: "success", url, provider: "toapis", model };
    } else {
      return sendJson(res, 400, { error: "unsupported kind: " + kind });
    }
    sendJson(res, 200, r);
  } catch (e) {
    const r = demoGenerate(kind, prompt);
    r.provider = "demo";
    r.error = "toapis_failed: " + e.message;
    sendJson(res, 200, r);
  }
}

async function handleModels(req, res) {
  const models = catalog();
  if (TOAPIS_KEY) {
    try {
      const r = await fetch(`${TOAPIS_BASE}/models`, { headers: { Authorization: `Bearer ${TOAPIS_KEY}` } });
      if (r.ok) {
        const j = await r.json();
        const ids = (j.data || []).map((m) => m.id).filter(Boolean);
        if (ids.length) models.text = Array.from(new Set([...models.text, ...ids]));
      }
    } catch {
      /* 忽略，使用静态目录 */
    }
  }
  sendJson(res, 200, { provider: "toapis", base: TOAPIS_BASE, demo: DEMO_MODE, models });
}

async function handleAgents(req, res) {
  const list = AGENTS.map((a) => ({ id: a.id, name: a.name, category: a.category, icon: a.icon, tagline: a.tagline }));
  sendJson(res, 200, { agents: list, count: list.length });
}

async function handleAgent(req, res) {
  const body = await readBody(req);
  const { agent: agentId, prompt, model } = body;
  const agent = getAgent(agentId);
  if (!agent) return sendJson(res, 404, { error: "agent not found: " + agentId });
  if (!prompt) return sendJson(res, 400, { error: "prompt required" });

  // Few-shot：仅对「提示词工程」类 agent 注入中文电影提示词范例（检索最相关的 top-5）
  const few = agent.category === "提示词工程"
    ? corpus.getFewShot(prompt, { k: 5 })
    : [];
  const fewMeta = { corpusSize: corpus.CORPUS_SIZE, used: few.map((e) => e.input) };

  if (DEMO_MODE || !TOAPIS_KEY) {
    return sendJson(res, 200, {
      ok: true,
      agent: agentId,
      name: agent.name,
      text: demoAgent(agent, prompt),
      model: agent.defaultModel,
      demo: true,
      fewShot: fewMeta,
    });
  }
  try {
    const sys = (agent.system || "") + corpus.buildFewShotBlock(few);
    const text = await chat(model || agent.defaultModel, prompt, sys, agent.temperature);
    return sendJson(res, 200, {
      ok: true,
      agent: agentId,
      name: agent.name,
      text,
      model: model || agent.defaultModel,
      demo: false,
      fewShot: fewMeta,
    });
  } catch (e) {
    return sendJson(res, 200, {
      ok: true,
      agent: agentId,
      name: agent.name,
      text: demoAgent(agent, prompt),
      model: agent.defaultModel,
      demo: true,
      fewShot: fewMeta,
      error: "toapis_failed: " + e.message,
    });
  }
}

// —— 角色库 ——
async function handleCharactersList(req, res) {
  const user = getUser(req);
  if (!user) return sendJson(res, 401, { error: "unauthorized" });
  const chars = listCharacters(store);
  const safe = chars.map((c) => ({
    id: c.id, name: c.name, tags: c.tags,
    description: c.description,
    promptTemplate: c.promptTemplate || null,
    custom: !!c.custom,
  }));
  sendJson(res, 200, { characters: safe, total: safe.length });
}

async function handleCharactersCreate(req, res) {
  const user = getUser(req);
  if (!user) return sendJson(res, 401, { error: "unauthorized" });
  const body = await readBody(req);
  const data = typeof body === "string" ? JSON.parse(body || "{}") : body;
  const ch = {
    id: "char-custom-" + Date.now().toString(36),
    name: String(data.name || "自定义角色").slice(0, 60),
    tags: data.tags || {},
    description: String(data.description || "").slice(0, 500),
    promptTemplate: data.promptTemplate ? String(data.promptTemplate).slice(0, 500) : null,
    custom: true,
    createdAt: Date.now(),
  };
  const customs = store.get("characters") || [];
  customs.push(ch);
  store.set("characters", customs);
  sendJson(res, 201, { character: ch });
}

function handleWechatLogin(req, res, q) {
  const redirectUrl = q.get("redirect") || FRONTEND_URL;
  if (!WECHAT_APPID || DEMO_MODE) {
    return redirect(res, `/api/auth/wechat/callback?code=demo_code&state=${encodeURIComponent(redirectUrl)}`);
  }
  const cb = `${FRONTEND_URL}/api/auth/wechat/callback`;
  const url =
    `https://open.weixin.qq.com/connect/oauth2/authorize` +
    `?appid=${WECHAT_APPID}&redirect_uri=${encodeURIComponent(cb)}` +
    `&response_type=code&scope=snsapi_userinfo&state=${encodeURIComponent(redirectUrl)}#wechat_redirect`;
  redirect(res, url);
}

async function handleWechatCallback(req, res, q) {
  const code = q.get("code");
  const state = q.get("state");
  const redirectUrl = (state && decodeURIComponent(state)) || FRONTEND_URL;

  let user;
  if (!WECHAT_APPID || DEMO_MODE || code === "demo_code") {
    user = { id: "demo-user", name: "微信游客 (Demo)", avatar: "" };
  } else {
    try {
      const tokRes = await fetch(
        `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`
      );
      const tok = await tokRes.json();
      if (tok.errcode) return res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }), res.end("微信授权失败: " + tok.errcode);
      const uiRes = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${tok.access_token}&openid=${tok.openid}`);
      const ui = await uiRes.json();
      user = { id: "wx_" + tok.openid, name: ui.nickname || "微信用户", avatar: ui.headimgurl || "" };
    } catch (e) {
      return res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }), res.end("微信用户信息获取失败: " + e.message);
    }
  }
  store.upsertUser(user);
  const token = signUser(user, JWT_SECRET);
  redirect(res, `${redirectUrl}?token=${encodeURIComponent(token)}`);
}

function newOrderId() {
  return "ord_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

async function handlePayCreate(req, res) {
  const body = await readBody(req);
  const { plan = "basic", amount = 9.9, credits = 100 } = body;
  const id = newOrderId();
  store.createOrder({ id, plan, amount, credits, status: "pending", createdAt: Date.now() });
  if (!WXPAY_MCH_ID || DEMO_MODE) {
    return sendJson(res, 200, {
      orderId: id,
      demo: true,
      amount,
      credits,
      payUrl: `/api/pay/simulate?orderId=${id}`,
      message: "演示环境：点击 payUrl 模拟支付成功",
    });
  }
  sendJson(res, 501, { error: "real wxpay not configured (need cert + v3 signing)" });
}

function handlePaySimulate(req, res, q) {
  const orderId = q.get("orderId");
  const o = store.getOrder(orderId);
  if (!o) return res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }), res.end("订单不存在");
  store.updateOrder(orderId, { status: "paid" });
  store.addCredits("demo-user", o.credits);
  redirect(res, `${FRONTEND_URL}/?pay=success&orderId=${orderId}`);
}

function handlePayNotify(req, res) {
  readBody(req).then((body) => {
    const orderId = body && body.orderId;
    if (orderId) store.updateOrder(orderId, { status: "paid" });
    sendJson(res, 200, { code: "SUCCESS", message: "ok" });
  });
}

function handlePayQuery(req, res, q) {
  const o = store.getOrder(q.get("orderId"));
  sendJson(res, 200, o || { status: "not_found" });
}

// —— 主服务器 ——
const server = http.createServer(async (req, res) => {
  // CORS 预检
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    });
    return res.end();
  }

  const u = new URL(req.url, "http://localhost");
  const p = u.pathname;
  const q = u.searchParams;

  try {
    if (p === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, { ok: true, demo: DEMO_MODE, toapis: !!TOAPIS_KEY, base: TOAPIS_BASE });
    }
    if (p === "/api/auth/wechat/login" && req.method === "GET") return handleWechatLogin(req, res, q);
    if (p === "/api/auth/wechat/callback" && req.method === "GET") return handleWechatCallback(req, res, q);
    if (p === "/api/pay/create" && req.method === "POST") return handlePayCreate(req, res);
    if (p === "/api/pay/simulate" && req.method === "GET") return handlePaySimulate(req, res, q);
    if (p === "/api/pay/notify" && req.method === "POST") return handlePayNotify(req, res);
    if (p === "/api/pay/query" && req.method === "GET") return handlePayQuery(req, res, q);

    if (p === "/api/v1/generate" && req.method === "POST") {
      const user = getUser(req);
      if (!user) return sendJson(res, 401, { error: "unauthorized" });
      return handleGenerate(req, res);
    }
    if (p === "/api/v1/models" && req.method === "GET") {
      const user = getUser(req);
      if (!user) return sendJson(res, 401, { error: "unauthorized" });
      return handleModels(req, res);
    }

    if (p === "/api/v1/agents" && req.method === "GET") {
      const user = getUser(req);
      if (!user) return sendJson(res, 401, { error: "unauthorized" });
      return handleAgents(req, res);
    }
    if (p === "/api/v1/agent" && req.method === "POST") {
      const user = getUser(req);
      if (!user) return sendJson(res, 401, { error: "unauthorized" });
      return handleAgent(req, res);
    }
    if (p === "/api/v1/characters" && req.method === "GET") {
      const user = getUser(req);
      if (!user) return sendJson(res, 401, { error: "unauthorized" });
      return handleCharactersList(req, res, store);
    }
    if (p === "/api/v1/characters" && req.method === "POST") {
      const user = getUser(req);
      if (!user) return sendJson(res, 401, { error: "unauthorized" });
      return handleCharactersCreate(req, res, store);
    }

    sendJson(res, 404, { error: "not_found", path: p });
  } catch (e) {
    console.error("[aimamax-api] error:", e);
    sendJson(res, 500, { error: e.message || "internal_error" });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`[aimamax-api] listening on ${PORT}`));
}

module.exports = server;
