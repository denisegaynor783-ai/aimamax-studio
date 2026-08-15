// ============================================================
// AIMAMAX Studio — 画布级面板（资产管理 / 分镜时间线）
// 把底栏两个原 TODO 空按钮做实为真实可用面板，消除功能空白。
// ============================================================
import { useMemo } from "react";
import { useStudio } from "../lib/store";
import { IconAssets, IconTimeline, IconImage, IconFilmStrip } from "../components/icons";

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

/* ── 分镜时间线面板（按 sequence 边拓扑排序，给出正片顺序） ── */
export function TimelinePanel({ onClose, onFocus }: { onClose: () => void; onFocus: (id: string) => void }) {
  const nodes = useStudio((s) => s.nodes);
  const edges = useStudio((s) => s.edges);

  const ordered = useMemo(() => {
    const shots = nodes.filter((n) => n.data.kind === "shot");
    if (shots.length === 0) return [];
    const seq = edges.filter((e) => (e.data?.rel ?? "sequence") === "sequence");
    const indeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    shots.forEach((s) => { indeg.set(s.id, 0); adj.set(s.id, []); });
    seq.forEach((e) => {
      if (adj.has(e.source) && indeg.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
      }
    });
    const seen = new Set<string>();
    const order: string[] = [];
    const q = shots.filter((s) => (indeg.get(s.id) ?? 0) === 0).map((s) => s.id);
    while (q.length) {
      const id = q.shift()!;
      if (seen.has(id) || !adj.has(id)) continue;
      seen.add(id);
      order.push(id);
      (adj.get(id) ?? []).forEach((t) => {
        if (seen.has(t)) return;
        indeg.set(t, (indeg.get(t) ?? 1) - 1);
        if ((indeg.get(t) ?? 0) <= 0) q.push(t);
      });
    }
    shots.forEach((s) => { if (!seen.has(s.id)) order.push(s.id); });
    return order.map((id) => shots.find((s) => s.id === id)!).filter(Boolean);
  }, [nodes, edges]);

  return (
    <div className="canvas-panel canvas-panel--wide" onClick={(e) => e.stopPropagation()}>
      <div className="canvas-panel__head">
        <span><IconTimeline size={15} /> 分镜时间线 <span className="canvas-panel__count">{ordered.length} 镜</span></span>
        <button className="node-action-submenu__x" onClick={onClose} title="关闭">×</button>
      </div>
      <div className="canvas-panel__body">
        {ordered.length === 0 ? (
          <div className="canvas-panel__empty">
            还没有分镜。在画布上用「添加节点 › 图片 / 视频」或「出图 / 出视频」创建分镜格，这里会按连线时序自动排成正片顺序。
          </div>
        ) : (
          <div className="timeline-track">
            {ordered.map((n, i) => {
              const r = (n.data.payload.results ?? []).find((x) => x.url);
              return (
                <button key={n.id} className="timeline-shot" onClick={() => onFocus(n.id)} title={n.data.label}>
                  <span className="timeline-shot__idx">{i + 1}</span>
                  <span className="timeline-shot__thumb">{r ? <img src={r.url} alt="" /> : <IconFilmStrip size={16} />}</span>
                  <span className="truncate timeline-shot__label">{n.data.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
