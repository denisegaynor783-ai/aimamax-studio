// ============================================================
// AIMAMAX Studio — 逐帧拉片对话框
// 选择本地视频 → 浏览器内真实抽取 3 帧 → 生成 3 个分镜格（sequence 串联 / 引用源节点）
// 无视频时回退为占位演示帧，保证离线可用、功能不空白。
// ============================================================
import { useCallback, useRef, useState } from "react";
import { useStudio } from "../lib/store";
import { IconFilmStrip, IconVideo } from "../components/icons";

const FRAME_COUNT = 3;

/** 生成 3 张占位演示帧（无视频时回退） */
function makePlaceholders(): string[] {
  return Array.from({ length: FRAME_COUNT }, (_, i) => {
    const c = document.createElement("canvas");
    c.width = 480;
    c.height = 270;
    const cx = c.getContext("2d")!;
    const g = cx.createLinearGradient(0, 0, 480, 270);
    g.addColorStop(0, "#16161e");
    g.addColorStop(1, "#2a2a34");
    cx.fillStyle = g;
    cx.fillRect(0, 0, 480, 270);
    cx.fillStyle = "#ff6b1a";
    cx.font = "bold 22px sans-serif";
    cx.textAlign = "center";
    cx.fillText(`帧 ${i + 1}（演示）`, 240, 142);
    return c.toDataURL("image/png");
  });
}

export function FrameStripDialog({
  origin,
  sourceId,
  onClose,
}: {
  origin: { x: number; y: number };
  sourceId: string | null;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** 抽取视频帧：均匀取 15% / 50% / 85% 处，逐帧 seek + 绘制 */
  const extract = useCallback((file: File) => {
    setErr(null);
    if (!file.type.startsWith("video/")) {
      setErr("当前选择的是图片：逐帧拉片面向视频，已生成 3 张占位演示帧。上传视频可抽取真实帧。");
      setFrames(makePlaceholders());
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.src = url;
    const out: string[] = [];
    let idx = 0;
    const nextSeek = () => {
      // 均匀分布在 15% ~ 85%
      v.currentTime = 0.15 + (0.7 * idx) / (FRAME_COUNT - 1);
    };
    v.onloadedmetadata = () => nextSeek();
    v.onerror = () => {
      setBusy(false);
      setErr("视频无法解码，已回退为占位演示帧。");
      setFrames(makePlaceholders());
      URL.revokeObjectURL(url);
    };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 270;
      const cx = c.getContext("2d")!;
      cx.drawImage(v, 0, 0, c.width, c.height);
      out.push(c.toDataURL("image/jpeg", 0.85));
      idx++;
      if (idx >= FRAME_COUNT) {
        setFrames([...out]);
        setBusy(false);
        URL.revokeObjectURL(url);
      } else {
        nextSeek();
      }
    };
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) extract(f);
    e.target.value = "";
  };

  /** 用抽取到的帧（或占位帧）生成 3 个分镜格 */
  const createShots = () => {
    if (frames.length === 0) return;
    const st = useStudio.getState();
    let prev: string | null = sourceId;
    frames.forEach((f, i) => {
      const id = st.addNode("shot", { x: origin.x + i * 300, y: origin.y + i * 10 });
      st.updateNodePayload(id, {
        note: `逐帧 帧 ${i + 1}`,
        results: [{ id: String(Date.now() + i), kind: "image", status: "success", url: f, createdAt: Date.now() }],
      });
      if (prev) st.connectRel(prev, id, i === 0 && sourceId ? "reference" : "sequence");
      prev = id;
    });
    onClose();
  };

  return (
    <div className="frame-dialog-overlay" onClick={onClose}>
      <div className="frame-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="frame-dialog__head">
          <span><IconFilmStrip size={15} /> 逐帧拉片 · 抽取 3 帧</span>
          <button className="node-action-submenu__x" onClick={onClose} title="关闭">×</button>
        </div>
        <div className="frame-dialog__body">
          <button className="frame-file" onClick={() => fileRef.current?.click()}>
            <IconVideo size={16} /> 选择视频文件（抽取 3 帧）
          </button>
          <input ref={fileRef} type="file" accept="video/*,image/*" style={{ display: "none" }} onChange={onPickFile} />

          {busy && <div className="frame-note">正在解码并抽取帧…</div>}
          {err && <div className="frame-note frame-note--warn">{err}</div>}

          {frames.length > 0 && (
            <div className="frame-previews">
              {frames.map((f, i) => (
                <div className="frame-prev" key={i}>
                  <img src={f} alt={`帧 ${i + 1}`} />
                  <span className="frame-prev__tag">帧 {i + 1}</span>
                </div>
              ))}
            </div>
          )}

          {frames.length === 0 && !busy && (
            <button className="frame-file frame-file--ghost" onClick={() => setFrames(makePlaceholders())}>
              没有视频？用占位演示帧生成 3 个分镜格
            </button>
          )}
        </div>
        <div className="frame-dialog__foot">
          <button className="btn btn--sm" onClick={onClose}>取消</button>
          <button className="btn btn--sm btn--primary" disabled={frames.length === 0} onClick={createShots}>
            生成 3 个分镜格
          </button>
        </div>
      </div>
    </div>
  );
}
