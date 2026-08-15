// ============================================================
// AIMAMAX Studio — 多抽选优（一镜多抽 N 次 · 评分选优）
// 参考 Hell Grind 64:1 抽卡比：靠海量抽卡 + 筛选，而非一次命中。
// 离线（demo）与真实后端均可运行；选中结果回写画布生成器节点。
// ============================================================
import { useEffect, useState } from "react";
import { useStudio } from "../lib/store";
import { generate } from "../lib/providers";
import { Button, Spinner } from "../components/ui";
import type { GenResult, GenKind } from "../lib/types";
import { IconClose, IconFilm } from "../components/icons";

interface Props {
  open: boolean;
  initialPrompt: string;
  kind?: GenKind;
  onClose: () => void;
  onPick: (r: GenResult) => void;
}

export default function BatchGen({ open, initialPrompt, kind = "image", onClose, onPick }: Props) {
  const { settings } = useStudio();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [count, setCount] = useState(4);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<GenResult[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      setPrompt(initialPrompt);
      setResults([]);
      setRatings({});
    }
  }, [open, initialPrompt]);

  const run = async () => {
    if (!prompt.trim() || running) return;
    setRunning(true);
    setResults([]);
    setRatings({});
    try {
      const tasks = Array.from({ length: count }).map(() =>
        generate({ kind, prompt: prompt.trim(), model: "", provider: "" }, settings)
      );
      const outs = await Promise.all(tasks);
      setResults(outs);
    } catch (e) {
      console.error("BatchGen run failed", e);
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  const setRating = (id: string, v: number) =>
    setRatings((r) => ({ ...r, [id]: r[id] === v ? 0 : v }));

  const pick = (r: GenResult) => {
    onPick(r);
    onClose();
  };

  const okCount = results.filter((r) => r.status === "success" && r.url).length;

  return (
    <div className="bg-modal" onClick={onClose}>
      <div className="batchgen" onClick={(e) => e.stopPropagation()}>
        <div className="batchgen__head">
          <span className="batchgen__title"><IconFilm size={18} /> 多抽选优</span>
          <button className="batchgen__x" onClick={onClose} title="关闭"><IconClose size={18} /></button>
        </div>

        <div className="batchgen__ctrl">
          <label className="batchgen__label">提示词</label>
          <textarea
            className="agents__input"
            rows={3}
            placeholder="输入本镜提示词（建议用 Agent 中心的电影级装配产出）"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="batchgen__row">
            <span className="batchgen__label">抽卡次数</span>
            <div className="batchgen__count">
              {[2, 4, 6, 8].map((n) => (
                <button key={n} className="batchgen__cnt" data-active={count === n} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
            <Button variant="primary" onClick={run} disabled={running || !prompt.trim()}>
              {running ? "抽卡中…" : `一镜多抽 ${count} 次`}
            </Button>
            {running && <Spinner size={16} />}
          </div>
          <div className="batchgen__hint">
            参考 Hell Grind：64:1 抽卡比——靠海量抽卡 + 筛选。离线为 demo 占位图；配置 API 网关后为真模型多抽。
          </div>
        </div>

        {results.length > 0 && (
          <div className="batchgen__grid">
            {results.map((r, i) => {
              const rating = ratings[r.id] || 0;
              const ok = r.status === "success" && r.url;
              return (
                <div key={r.id} className="batchgen__cell" data-ok={ok}>
                  <div className="batchgen__thumb">
                    {ok ? (
                      kind === "video" ? (
                        <video src={r.url} muted loop autoPlay playsInline />
                      ) : (
                        <img src={r.url} alt={`抽卡 ${i + 1}`} />
                      )
                    ) : (
                      <div className="batchgen__err">失败<br />{r.error || "无结果"}</div>
                    )}
                    <span className="batchgen__idx">#{i + 1}</span>
                  </div>
                  <div className="batchgen__meta">
                    <div className="batchgen__stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} className="batchgen__star" data-on={s <= rating} onClick={() => setRating(r.id, s)} title={`${s} 星`}>★</button>
                      ))}
                    </div>
                    <div className="batchgen__sub">
                      {r.model || "—"} · {r.provider || "—"}
                      {rating > 0 && <em className="batchgen__rate"> {rating}★</em>}
                    </div>
                    <button className="batchgen__pick" disabled={!ok} onClick={() => pick(r)}>选为成片</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {okCount > 0 && (
          <div className="batchgen__foot">成功 {okCount}/{results.length} 张 · 给满意的打星后「选为成片」回写画布</div>
        )}
      </div>
    </div>
  );
}
