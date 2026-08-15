// ============================================================
// AIMAMAX Studio — 连通性上下文引擎（graph.ts）
// 把「上游节点」折叠为结构化上下文，注入生成提示词 / 参考图，
// 让角色一致性、场景氛围、配乐情绪、参考素材真正流过画布连线。
// 被 store.generateFromNode / StudioNode / Inspector 复用。
// ============================================================
import type {
  EdgeRel,
  GenKind,
  NodeKind,
  StudioEdge,
  StudioNode,
} from "./types";

/** 各类型节点的结构化字段规范（检视器 & 节点卡片据此外显编辑） */
export const KIND_FIELDS: Partial<Record<NodeKind, { key: string; label: string; placeholder: string }[]>> = {
  character: [
    { key: "personality", label: "性格", placeholder: "如：沉稳、外冷内热" },
    { key: "appearance", label: "外貌", placeholder: "如：黑发、瘦高、左眉疤" },
    { key: "costume", label: "服装", placeholder: "如：黑色风衣、银链" },
    { key: "age", label: "年龄", placeholder: "如：28 岁" },
  ],
  scene: [
    { key: "location", label: "地点", placeholder: "如：废弃天台、雨夜街道" },
    { key: "time", label: "时间", placeholder: "如：黄昏、深夜" },
    { key: "lighting", label: "光线", placeholder: "如：霓虹冷光、逆光剪影" },
    { key: "mood", label: "氛围", placeholder: "如：压抑而浪漫" },
  ],
  shot: [
    { key: "framing", label: "景别", placeholder: "如：近景、全景、特写" },
    { key: "angle", label: "角度", placeholder: "如：俯拍、仰拍、平视" },
    { key: "camera", label: "运镜", placeholder: "如：推近、横移、跟拍" },
    { key: "duration", label: "时长", placeholder: "如：3 秒、5~8 秒" },
  ],
  music: [
    { key: "style", label: "风格", placeholder: "如：电子、弦乐、Lo-Fi" },
    { key: "mood", label: "情绪", placeholder: "如：紧张、治愈、史诗" },
    { key: "bpm", label: "节奏 BPM", placeholder: "如：120" },
    { key: "instruments", label: "乐器", placeholder: "如：钢琴、合成器" },
  ],
};

export interface CtxItem {
  id: string;
  kind: NodeKind;
  label: string;
  /** 该节点折叠后的关键设定文本 */
  summary: string;
  /** 该节点持有的最新图像（用作参考图） */
  image?: string;
  /** 该节点连入当前节点的连线关系 */
  rel: EdgeRel;
}

export interface GenContext {
  characters: CtxItem[];
  scenes: CtxItem[];
  shots: CtxItem[];
  musics: CtxItem[];
  scripts: CtxItem[];
  texts: CtxItem[];
  assets: CtxItem[];
  /** 是否存在任意上游（用于 UI 提示） */
  hasUpstream: boolean;
}

function latestImage(n: StudioNode): string | undefined {
  const r = (n.data.payload.results ?? []).filter((x) => x.status === "success" && x.url).slice(-1)[0];
  return r?.url;
}

/** 把单个节点折叠成「设定摘要」 */
function summarize(n: StudioNode): string {
  const p = n.data.payload;
  const f = p.fields ?? {};
  if (n.data.kind === "character" || n.data.kind === "scene" || n.data.kind === "shot" || n.data.kind === "music") {
    const keys = KIND_FIELDS[n.data.kind] ?? [];
    const parts = keys.map((k) => (f[k.key] ? `${k.label}：${f[k.key]}` : "")).filter(Boolean);
    if (parts.length) return parts.join("，");
    return p.prompt || p.note || "";
  }
  if (n.data.kind === "script") {
    const meta = [p.genre && `类型 ${p.genre}`, p.mood && `基调 ${p.mood}`, p.duration && `时长 ${p.duration}`]
      .filter(Boolean)
      .join("，");
    const body = (p.prompt || p.note || "").slice(0, 120);
    return [meta, body].filter(Boolean).join("；");
  }
  if (n.data.kind === "asset") {
    const tags = (p.note || (p.tags ?? []).join("、"));
    return tags || "参考素材（含图像）";
  }
  // text / prompt / generator
  return p.prompt || p.note || "";
}

/** 聚合某节点的全部「直接上游」（一条连线 = 一个上游，按类型归类） */
export function getContext(nodes: StudioNode[], edges: StudioEdge[], id: string): GenContext {
  const incoming = edges.filter((e) => e.target === id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: GenContext = {
    characters: [], scenes: [], shots: [], musics: [], scripts: [], texts: [], assets: [],
    hasUpstream: incoming.length > 0,
  };
  for (const e of incoming) {
    const up = byId.get(e.source);
    if (!up || up.data.kind === "group") continue;
    const item: CtxItem = {
      id: up.id,
      kind: up.data.kind,
      label: up.data.label,
      summary: summarize(up),
      image: latestImage(up),
      rel: e.data?.rel ?? "sequence",
    };
    switch (up.data.kind) {
      case "character": out.characters.push(item); break;
      case "scene": out.scenes.push(item); break;
      case "shot": out.shots.push(item); break;
      case "music": out.musics.push(item); break;
      case "script": out.scripts.push(item); break;
      case "asset": out.assets.push(item); break;
      case "text":
      case "prompt":
      case "generator": out.texts.push(item); break;
    }
  }
  return out;
}

/** 把上下文 + 用户提示词 拼成增强提示词（连通性真正进入生成） */
export function composePrompt(ctx: GenContext, userPrompt: string, kind: GenKind): string {
  const blocks: string[] = [];
  if (ctx.characters.length) {
    blocks.push(
      "【角色设定 · 须保持视觉一致性】\n" +
        ctx.characters.map((c) => `- ${c.label}：${c.summary}`).join("\n")
    );
  }
  if (ctx.scenes.length) {
    blocks.push(
      "【场景氛围】\n" + ctx.scenes.map((s) => `- ${s.label}：${s.summary}`).join("\n")
    );
  }
  if (ctx.musics.length) {
    blocks.push(
      "【配乐情绪】\n" + ctx.musics.map((m) => `- ${m.label}：${m.summary}`).join("\n")
    );
  }
  if (ctx.scripts.length) {
    blocks.push(
      "【剧本设定】\n" + ctx.scripts.map((s) => `- ${s.label}：${s.summary}`).join("\n")
    );
  }
  if (ctx.texts.length) {
    blocks.push(
      "【文本 / 上游输入】\n" + ctx.texts.map((t) => `- ${t.label}：${t.summary}`).join("\n")
    );
  }
  if (ctx.assets.length) {
    blocks.push(
      "【参考素材】\n" + ctx.assets.map((a) => `- ${a.label}：${a.summary}`).join("\n")
    );
  }

  const ctxStr = blocks.join("\n\n");
  const lead =
    kind === "image"
      ? "根据以下设定生成画面："
      : kind === "video"
      ? "根据以下设定生成动态镜头："
      : "根据以下设定撰写内容：";
  const head = ctxStr ? `${lead}\n\n${ctxStr}\n\n` : "";
  const tail = userPrompt?.trim() ? userPrompt.trim() : "（无额外提示词，请基于上述设定生成）";
  return `${head}${tail}`;
}

/** 取最近的上游图像作为参考图（优先素材节点，其次任意带图上游） */
export function initImageFor(nodes: StudioNode[], edges: StudioEdge[], id: string): string | undefined {
  const incoming = edges.filter((e) => e.target === id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // 先找 asset 节点
  for (const e of incoming) {
    const up = byId.get(e.source);
    if (up?.data.kind === "asset") {
      const img = latestImage(up);
      if (img) return img;
    }
  }
  for (const e of incoming) {
    const up = byId.get(e.source);
    if (!up) continue;
    const img = latestImage(up);
    if (img) return img;
  }
  return undefined;
}

/** 结构化字段值读取（检视器 / 节点卡片用） */
export function fieldValues(node: StudioNode): Record<string, string> {
  return node.data.payload.fields ?? {};
}
