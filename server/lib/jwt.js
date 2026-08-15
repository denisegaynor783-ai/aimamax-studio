// 零依赖 JWT（HS256），仅用 Node 内置 crypto
const crypto = require("crypto");

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signUser(user, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify({ sub: user.id, name: user.name, avatar: user.avatar || "", exp: Date.now() + 30 * 86400 * 1000 }));
  const sig = b64url(crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

function verifyToken(token, secret) {
  try {
    const parts = String(token).split(".");
    if (parts.length !== 3) return null;
    const [h, p, sig] = parts;
    const expected = b64url(crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest());
    // 常量时间比较
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { signUser, verifyToken };
