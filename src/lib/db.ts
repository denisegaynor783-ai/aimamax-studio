// ============================================================
// AIMAMAX Studio — IndexedDB 持久化（idb 封装）
// 画布、资产、设置全部落本地，零后端、永不丢稿。
// ============================================================
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Project, Asset, AppSettings } from "./types";

interface StudioDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { "by-updated": number };
  };
  assets: {
    key: string;
    value: Asset;
    indexes: { "by-kind": string };
  };
  kv: {
    key: string;
    value: { key: string; value: unknown };
  };
}

const DB_NAME = "aimamax-studio";
const DB_VERSION = 1;

let dbp: Promise<IDBPDatabase<StudioDB>> | null = null;

function db() {
  if (!dbp) {
    dbp = openDB<StudioDB>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        const p = d.createObjectStore("projects", { keyPath: "id" });
        p.createIndex("by-updated", "updatedAt");
        const a = d.createObjectStore("assets", { keyPath: "id" });
        a.createIndex("by-kind", "kind");
        d.createObjectStore("kv", { keyPath: "key" });
      },
    });
  }
  return dbp;
}

const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// —— 项目 ——
export async function listProjects(): Promise<Project[]> {
  const all = await (await db()).getAllFromIndex("projects", "by-updated");
  return all.reverse(); // 最新在前
}

export async function getProject(id: string): Promise<Project | undefined> {
  return (await db()).get("projects", id);
}

export async function saveProject(p: Project): Promise<void> {
  p.updatedAt = Date.now();
  await (await db()).put("projects", p);
}

export async function deleteProject(id: string): Promise<void> {
  await (await db()).delete("projects", id);
}

export async function renameProject(id: string, name: string): Promise<void> {
  const p = await getProject(id);
  if (p) {
    p.name = name;
    await saveProject(p);
  }
}

// —— 资产 ——
export async function listAssets(): Promise<Asset[]> {
  const all = await (await db()).getAll("assets");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putAsset(a: Asset): Promise<void> {
  await (await db()).put("assets", a);
}

export async function deleteAsset(id: string): Promise<void> {
  await (await db()).delete("assets", id);
}

// —— 设置（kv） ——
export async function getSettings(): Promise<AppSettings | undefined> {
  const row = await (await db()).get("kv", "settings");
  return row?.value as AppSettings | undefined;
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await (await db()).put("kv", { key: "settings", value: s });
}

export { uid };
