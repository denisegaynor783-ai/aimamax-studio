// 轻量持久化：用户 / 订单 / 额度（JSON 文件，演示够用；生产可换 DB）
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA, { recursive: true });
const FILE = path.join(DATA, "store.json");

let db = { users: {}, orders: {}, credits: {} };
try {
  db = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
  /* 首次启动无文件 */
}

function persist() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("[store] persist failed", e.message);
  }
}

function upsertUser(u) {
  db.users[u.id] = u;
  if (db.credits[u.id] == null) db.credits[u.id] = 0;
  persist();
}
function getUser(id) {
  return db.users[id];
}
function getCredits(id) {
  return db.credits[id] || 0;
}
function addCredits(id, n) {
  db.credits[id] = (db.credits[id] || 0) + n;
  persist();
}
function createOrder(o) {
  db.orders[o.id] = o;
  persist();
}
function getOrder(id) {
  return db.orders[id];
}
function updateOrder(id, patch) {
  if (!db.orders[id]) return;
  db.orders[id] = { ...db.orders[id], ...patch };
  persist();
}

module.exports = { upsertUser, getUser, getCredits, addCredits, createOrder, getOrder, updateOrder };
