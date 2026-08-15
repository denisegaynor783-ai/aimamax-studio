// ============================================================
// AIMAMAX Studio — 画布级面板（资产管理 / 分镜时间线）
// 把底栏两个原 TODO 空按钮做实为真实可用面板，消除功能空白。
// ============================================================
import { useMemo, useState } from "react";
import { useStudio } from "../lib/store";
import type { StudioEdge, StudioNode } from "../lib/types";
import { IconAssets, IconTimeline, IconImage, IconFilmStrip, IconExport } from "../components/icons";

/**
 * 把分镜节点排成「正片顺序」：
 *  - 若传入 order（手动拖拽重排结果），按 order 优先、未包含的新镜头追加其后；
 *  - 否则按 sequence 连线拓扑排序（缺省时序）。
 * 同时在时间线面板与底部故事条复用，保证两处顺序一致。
 */
export function orderedShots(nodes: StudioNode[], edges: StudioEdge[], order?: string[]): StudioNode[] {
  const shots = nodes.filter((n) => n.data.kind === "shot");
  if (shots.length === 0) return [];

  if (order && order.length > 0) {
    const byId = new Map(shots.map((s) => [s.id, s] as const));
    const out: StudioNode[] = [];
    order.forEach((id) => {
      const n = byId.get(id);
      if (n) {
        out.push(n);
        byId.delete(id);
      }
    });
    byId.forEach((n) => out.push(n)); // 新加的镜头按原序追加
    return out;
  }

  const seq = edges.filter((e) => (e.data?.rel ?? "sequence") === "sequence");
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  shots.forEach((s) => {
    indeg.set(s.id, 0);
    adj.set(s.id, []);
  });
  seq.forEach((e) => {
    if (adj.has(e.source) && indeg.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    }
  });
  const seen = new Set<string>();
  const orderArr: string[] = [];
  const q = shots.filter((s) => (indeg.get(s.id) ?? 0) === 0).map((s) => s.id);
  while (q.length) {
    const id = q.shift()!;
    if (seen.has(id) || !adj.has(id)) continue;
    seen.add(id);
    orderArr.push(id);
    (adj.get(id) ?? []).forEach((t) => {
      if (seen.has(t)) return;
      indeg.set(t, (indeg.get(t) ?? 1) - 1);
      if ((indeg.get(t) ?? 0) <= 0) q.push(t);
    });
  }
  shots.forEach((s) => {
    if (!seen.has(s.id)) orderArr.push(s.id);
  });
  return orderArr.map((id) => shots.find((s) => s.id === id)!).filter(Boolean);
}

/* ── 资产管理面板 ── */
export function AssetPanel({ onClose, onInsert }: { onClose: () => void; onInsert: (assetId: string) => void }) {
  const assets = useStudio((s) => s.assets);
  return (
    <div className="canvas-panel" onClick={(e) => e.stopPropagation()}>
      <div className="canvas-panel__head">
        <span><IconAssets size={15} /> 资产管理</span>
        <button className="node-action-submenu__x" onClick={onClose} title="关闭">×</button>
      </div>
      <div className="canvas-panel__body">
        {assets.length === 0 ? (
          <div className="canvas-panel__empty">
            暂无素材。用画布「添加资源 › 上传图片」或在节点上「出图 / 出视频」后，会自动入库到这里，可随时插入复用。
          </div>
        ) : (
          <div className="canvas-panel__grid">
            {assets.map((a) => (
              <button key={a.id} className="asset-card" onClick={() => onInsert(a.id)} title="点击插入到画布中心">
                <span className="asset-card__thumb">{a.preview ? <img src={a.preview} alt="" /> : <IconImage size={16} />}</span>
                <span className="truncate">{a.name}</span>
                <span className="asset-card__kind">{a.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 分镜时间线面板（可拖拽重排 + 导出 JSON / 分镜图） ── */
export function TimelinePanel({ onClose, onFocus }: { onClose: () => void; onFocus: (id: string) => void }) {
  const nodes = useStudio((s) => s.nodes);
  const edges = useStudio((s) => s.edges);
  const order = useStudio((s) => s.timelineOrder);
  const setTimelineOrder = useStudio((s) => s.setTimelineOrder);
  const projectName = useStudio((s) => s.project?.name ?? "项目");

  const ordered = useMemo(() => orderedShots(nodes, edges, order), [nodes, edges, order]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // 拖拽重排：把 dragId 移动到 dropId 之前
  const reorder = (fromId: string, toId: string) => {
    const ids = ordered.map((n) => n.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setTimelineOrder(ids);
  };

  // 导出为 JSON（含顺序 + 提示词 + 结果图 URL）
  const exportJSON = () => {
    if (ordered.length === 0) return;
    const data = {
      project: projectName,
      exportedAt: new Date().toISOString(),
      count: ordered.length,
      timeline: ordered.map((n, i) => ({
        index: i + 1,
        id: n.id,
        label: n.data.label,
        prompt: n.data.payload.prompt || n.data.payload.note || "",
        resultUrl: (n.data.payload.results ?? []).find((r) => r.url)?.url ?? null,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `分镜时间线_${projectName}_${ordered.length}镜.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出为分镜图（横向故事板 strip）
  const exportPNG = async () => {
    if (ordered.length === 0) return;
    const W = 280, H = 158, PAD = 18, GAP = 14, LABEL_H = 30;
    const canvas = document.createElement("canvas");
    canvas.width = PAD * 2 + ordered.length * (W + GAP) - GAP;
    canvas.height = PAD * 2 + H + LABEL_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#070709";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const load = (src: string) =>
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });

    let ok = true;
    try {
      for (let i = 0; i < ordered.length; i++) {
        const node = ordered[i];
        const r = (node.data.payload.results ?? []).find((x) => x.url);
        const x = PAD + i * (W + GAP);
        ctx.fillStyle = "#15151c";
        ctx.fillRect(x, PAD, W, H);
        if (r?.url) {
          try {
            const img = await load(r.url);
            ctx.drawImage(img, x, PAD, W, H);
          } catch {
            /* 跨域/加载失败：留空底 */
          }
        }
        // 序号
        ctx.fillStyle = "#ff6b1a";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(String(i + 1), x + 8, PAD + 24);
        // 标签
        ctx.fillStyle = "#cfd2e0";
        ctx.font = "12px sans-serif";
        const label = (node.data.label || "").slice(0, 18);
        ctx.fillText(label, x + 8, PAD + H + 20);
      }
      const png = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = png;
      a.download = `分镜图_${projectName}_${ordered.length}镜.png`;
      a.click();
    } catch {
      ok = false;
      alert("图片导出需要同源或本地图片（远端图受跨域限制）。已为你改用 JSON 导出。");
      exportJSON();
    }
    void ok;
  };

  return (
    <div className="canvas-panel canvas-panel--wide" onClick={(e) => e.stopPropagation()}>
      <div className="canvas-panel__head">
        <span><IconTimeline size={15} /> 分镜时间线 <span className="canvas-panel__count">{ordered.length} 镜</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            className="panel-btn"
            disabled={ordered.length === 0}
            title="导出为分镜 JSON（顺序+提示词+结果图）"
            onClick={exportJSON}
          >
            <IconExport size={13} /> JSON
          </button>
          <button
            className="panel-btn"
            disabled={ordered.length === 0}
            title="导出为分镜故事板图片"
            onClick={() => void exportPNG()}
          >
            <IconExport size={13} /> 分镜图
          </button>
          <button
            className="panel-btn"
            disabled={order.length === 0}
            title="重置为按连线时序自动排序"
            onClick={() => setTimelineOrder([])}
          >
            重置排序
          </button>
          <button className="node-action-submenu__x" onClick={onClose} title="关闭">×</button>
        </div>
      </div>
      <div className="canvas-panel__body">
        {ordered.length === 0 ? (
          <div className="canvas-panel__empty">
            还没有分镜。在画布上用「添加节点 › 图片 / 视频」或「出图 / 出视频」创建分镜格，这里会按连线时序自动排成正片顺序；可拖拽卡片手动调整顺序。
          </div>
        ) : (
          <>
            <div className="canvas-panel__hint">拖拽卡片可手动调整正片顺序（会写回时间线并同步底部故事条）。</div>
            <div className="timeline-track">
              {ordered.map((n) => {
                const r = (n.data.payload.results ?? []).find((x) => x.url);
                return (
                  <div
                    key={n.id}
                    className="timeline-shot"
                    draggable
                    data-dragging={dragId === n.id}
                    data-over={overId === n.id && dragId !== n.id}
                    onClick={() => onFocus(n.id)}
                    onDragStart={(e) => {
                      setDragId(n.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverId(n.id);
                    }}
                    onDragLeave={() => setOverId((d) => (d === n.id ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) reorder(dragId, n.id);
                      setDragId(null);
                      setOverId(null);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    title={`${n.data.label}（点击聚焦 · 拖拽排序）`}
                  >
                    <span className="timeline-shot__idx">{ordered.indexOf(n) + 1}</span>
                    <span className="timeline-shot__grip" title="拖拽排序">⠿</span>
                    <span className="timeline-shot__thumb">{r ? <img src={r.url} alt="" /> : <IconFilmStrip size={16} />}</span>
                    <span className="truncate timeline-shot__label">{n.data.label}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
