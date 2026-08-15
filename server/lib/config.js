// 环境配置：所有密钥走环境变量，绝不硬编码。
// 零依赖：内置极简 .env 解析（存在则读取，缺失键才用默认值）。
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const file = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(file)) return;
  try {
    const txt = fs.readFileSync(file, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* 忽略 .env 读取错误 */
  }
}
loadEnv();

const TOAPIS_BASE = process.env.TOAPIS_BASE || "https://toapis.com/v1";
const TOAPIS_KEY = process.env.TOAPIS_KEY || "";

// 无 ToAPIs 密钥即进入 Demo 模式（后端用占位结果，不耗额度）
const DEMO_MODE = !TOAPIS_KEY;

// 默认允许匿名调用生成接口（演示/开发期让画布立即可用）。
// 生产上线请设 ALLOW_ANON=0 强制微信登录。
const ALLOW_ANON = process.env.ALLOW_ANON !== "0";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://ninedeerselect.com";

// 微信开放平台（网站应用）凭证 —— 占位，配置后走真实 OAuth
const WECHAT_APPID = process.env.WECHAT_APPID || "";
const WECHAT_SECRET = process.env.WECHAT_SECRET || "";

// 微信支付（商户号 / APIv3 key / 证书） —— 占位
const WXPAY_MCH_ID = process.env.WXPAY_MCH_ID || "";
const WXPAY_API_KEY = process.env.WXPAY_API_KEY || "";
const WXPAY_APPID = process.env.WXPAY_APPID || WECHAT_APPID;

module.exports = {
  TOAPIS_BASE,
  TOAPIS_KEY,
  DEMO_MODE,
  ALLOW_ANON,
  JWT_SECRET,
  FRONTEND_URL,
  WECHAT_APPID,
  WECHAT_SECRET,
  WXPAY_MCH_ID,
  WXPAY_API_KEY,
  WXPAY_APPID,
};
