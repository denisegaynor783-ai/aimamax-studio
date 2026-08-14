// ============================================================
// AIMAMAX Studio — 设置（AI 供应商 / 导出导入 / 关于）
// ============================================================
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useStudio } from "../lib/store";
import * as db from "../lib/db";
import { Button, Field, Toggle, Badge, Panel } from "../components/ui";
import { IconSave, IconExport, IconImport, IconWarn, IconCheck } from "../components/icons";
import { DEFAULT_MODELS, PROVIDER_PRESETS } from "../lib/providers";
import type { AppSettings, ProviderConfig, ProviderKind } from "../lib/types";

function download(filename: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const { settings, updateSettings, saveProvider, project, nodes } = useStudio();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "models";
  const setTab = (t: string) => setParams({ tab: t }, { replace: true });

  return (
    <div className="content" style={{ maxWidth: 880 }}>
      <div className="page-head">
        <div className="eyebrow">SETTINGS</div>
        <h1>设置</h1>
      </div>

      <div className="toolrow" style={{ marginBottom: 20 }}>
        <Button variant={tab === "models" ? "primary" : "ghost"} size="sm" onClick={() => setTab("models")}>AI 模型</Button>
        <Button variant={tab === "export" ? "primary" : "ghost"} size="sm" onClick={() => setTab("export")}>导出 / 导入</Button>
        <Button variant={tab === "about" ? "primary" : "ghost"} size="sm" onClick={() => setTab("about")}>关于</Button>
      </div>

      {tab === "models" && <ModelsTab settings={settings} updateSettings={updateSettings} saveProvider={saveProvider} />}
      {tab === "export" && <ExportTab project={project} nodes={nodes} />}
      {tab === "about" && <AboutTab />}
    </div>
  );
}

// —— AI 模型 ——
function ModelsTab({
  settings,
  updateSettings,
  saveProvider,
}: {
  settings: AppSettings;
  updateSettings: (p: Partial<AppSettings>) => Promise<void>;
  saveProvider: (p: ProviderConfig) => Promise<void>;
}) {
  return (
    <div>
      <Panel title="运行模式" eyebrow="MODE" style={{ marginBottom: 20 }}>
        <div className="set-row" style={{ borderBottom: "none" }}>
          <div className="set-row__main">
            <div className="set-row__title">Demo 离线引擎</div>
            <div className="set-row__desc">开启后所有生成走本地占位（零网络、零额度），适合先搭好创意结构；配好密钥后可关闭以调用真实模型。</div>
          </div>
          <Toggle checked={settings.demoMode} onChange={(v) => updateSettings({ demoMode: v })} />
        </div>
      </Panel>

      <div className="eyebrow" style={{ marginBottom: 10 }}>模型供应商</div>
      {settings.providers.map((p) => (
        <ProviderRow key={p.id} p={p} onSave={saveProvider} />
      ))}

      <Panel title="默认模型" eyebrow="DEFAULTS" style={{ marginTop: 20 }}>
        <ModelSelect label="默认图像模型" value={settings.defaultImageModel} onChange={(v) => updateSettings({ defaultImageModel: v })} settings={settings} />
        <ModelSelect label="默认视频模型" value={settings.defaultVideoModel} onChange={(v) => updateSettings({ defaultVideoModel: v })} settings={settings} />
        <ModelSelect label="默认文本模型" value={settings.defaultTextModel} onChange={(v) => updateSettings({ defaultTextModel: v })} settings={settings} />
      </Panel>
    </div>
  );
}

function ProviderRow({ p, onSave }: { p: ProviderConfig; onSave: (p: ProviderConfig) => Promise<void> }) {
  const [draft, setDraft] = useState<ProviderConfig>(p);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(p);

  const commit = async () => {
    await onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const resetModels = () => setDraft({ ...draft, models: DEFAULT_MODELS[draft.kind as ProviderKind] });

  return (
    <div className="prov-card" data-enabled={p.enabled}>
      <div className="set-row" style={{ borderBottom: "none", paddingTop: 0 }}>
        <div className="set-row__main">
          <div className="set-row__title">{p.name} <span className="faint" style={{ fontWeight: 400, fontSize: 11 }}>{PROVIDER_PRESETS[p.kind].label}</span></div>
          <div className="set-row__desc">{p.kind === "demo" ? "离线占位引擎，无需密钥" : "OpenAI 兼容端点"}</div>
        </div>
        {p.kind !== "demo" && <Toggle checked={p.enabled} onChange={(v) => setDraft({ ...draft, enabled: v })} />}
      </div>

      {p.kind !== "demo" && (
        <>
          <Field label="API Base URL">
            <input className="input" value={draft.baseUrl} placeholder={PROVIDER_PRESETS[p.kind].baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
          </Field>
          <Field label="API Key">
            <input className="input" type="password" value={draft.apiKey} placeholder="sk-..." onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} />
          </Field>
          <Field label="可用模型（逗号分隔）">
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" value={draft.models.join(", ")} onChange={(e) => setDraft({ ...draft, models: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <Button size="sm" variant="ghost" onClick={resetModels}>重置</Button>
            </div>
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {saved ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ok)" }}><IconCheck size={15} /> 已保存</span> : (
              <Button size="sm" variant="primary" icon={<IconSave size={14} />} disabled={!dirty} onClick={commit}>保存供应商</Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ModelSelect({ label, value, onChange, settings }: {
  label: string; value: string; onChange: (v: string) => void;
  settings: AppSettings;
}) {
  const opts = settings.providers.filter((p) => p.enabled || p.kind === "demo").flatMap((p) => p.models);
  return (
    <Field label={label}>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {opts.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </Field>
  );
}

// —— 导出 / 导入 ——
function ExportTab({ project, nodes }: { project: import("../lib/types").Project | null; nodes: import("../lib/types").StudioNode[] }) {
  const importProject = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.id || !data.doc) throw new Error("文件不是有效的 AIMAMAX 工程");
      const proj = { ...data, id: db.uid(), createdAt: Date.now(), updatedAt: Date.now(), name: (data.name ?? "导入项目") + " (导入)" };
      await db.saveProject(proj);
      alert("导入成功，已加入「我的项目」。");
    } catch (e) {
      alert("导入失败：" + (e as Error).message);
    }
  };

  const exportJSON = () => {
    if (!project) return;
    download(`${project.name}.aimamax.json`, JSON.stringify(project, null, 2));
  };

  const exportStoryboard = (asCsv: boolean) => {
    if (!project) return;
    const rows = nodes.map((n, i) => ({
      序号: i + 1,
      节点: n.data.label,
      类型: n.data.kind,
      提示词: (n.data.payload.prompt ?? "").replace(/\n/g, " "),
      结果数: n.data.payload.results?.length ?? 0,
      首图: n.data.payload.results?.find((r) => r.url)?.url ?? "",
    }));
    if (asCsv) {
      const head = Object.keys(rows[0] ?? { 序号: "", 节点: "", 类型: "", 提示词: "", 结果数: "", 首图: "" });
      const lines = [head.join(",")].concat(
        rows.map((r) => head.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? "")).join(","))
      );
      download(`${project.name}-分镜表.csv`, "﻿" + lines.join("\n"), "text/csv");
    } else {
      download(`${project.name}-分镜表.json`, JSON.stringify(rows, null, 2));
    }
  };

  return (
    <div>
      <Panel title="当前项目导出" eyebrow="EXPORT" style={{ marginBottom: 20 }}>
        {project ? (
          <>
            <div className="set-row__desc" style={{ marginBottom: 14 }}>正在编辑：<b>{project.name}</b></div>
            <div className="toolrow">
              <Button variant="primary" icon={<IconExport size={15} />} onClick={exportJSON}>导出工程 JSON</Button>
              <Button variant="ghost" icon={<IconExport size={15} />} onClick={() => exportStoryboard(false)}>分镜表 JSON</Button>
              <Button variant="ghost" icon={<IconExport size={15} />} onClick={() => exportStoryboard(true)}>分镜表 CSV</Button>
            </div>
          </>
        ) : (
          <div className="dim" style={{ fontSize: 13, display: "flex", gap: 10, alignItems: "center" }}>
            <IconWarn size={18} /> 当前未打开项目。请先在「创作」或「我的项目」中打开一个项目，再导出。
          </div>
        )}
      </Panel>

      <Panel title="导入工程" eyebrow="IMPORT">
        <div className="set-row__desc" style={{ marginBottom: 12 }}>导入一个 .aimamax.json 工程文件，会作为新项目加入本地库。</div>
        <label className="btn btn--ghost" style={{ display: "inline-flex" }}>
          <IconImport size={15} /> 选择文件
          <input type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importProject(f); }} />
        </label>
      </Panel>
    </div>
  );
}

// —— 关于 ——
function AboutTab() {
  return (
    <Panel title="AIMAMAX Studio" eyebrow="ABOUT">
      <div className="set-row__desc" style={{ lineHeight: 1.8 }}>
        影院控制台风格的 AI 影视 / 漫剧导演工作台。<br />
        架构：纯静态 SPA（Vite + React），部署于 Hostinger 静态托管（ninedeerselect.com），零服务器依赖。<br />
        数据：全部存于浏览器 IndexedDB，离线可用、刷新不丢。<br />
        AI：OpenAI 兼容 / ToAPIs / 火山方舟 抽象统一，未配密钥时自动回退 Demo 引擎。<br />
        版本：v1.0.0 · 品牌沿用 AIMAMAX（ninedeerselect.com）
      </div>
      <div style={{ marginTop: 16 }}>
        <Badge tone="film">STATIC SPA</Badge> <Badge tone="ok">ZERO BACKEND</Badge> <Badge tone="ghost">IndexedDB</Badge>
      </div>
    </Panel>
  );
}
