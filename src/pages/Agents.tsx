// ============================================================
// AIMAMAX Studio — Agent 中心
// 多维度专业 Agent 工作台：选 Agent → 输入 → 生成专业内容 → 复制 / 发送到画布
// ============================================================
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudio } from "../lib/store";
import {
  AGENTS,
  CATEGORIES,
  getAgent,
  runAgent,
  CINEMATIC_FOUNDATION,
  SHOT_SKELETON,
  CINE_CONSTRAINTS,
  buildCinePrompt,
  type CineShotInput,
} from "../lib/agents";
import { Button, IconButton, Spinner } from "../components/ui";
import {
  IconSpark,
  IconScript,
  IconFilmStrip,
  IconImage,
  IconCharacter,
  IconVideo,
  IconCube,
  IconMusic,
  IconText,
  IconDuplicate,
  IconDirector,
  IconLink,
} from "../components/icons";

const ICONS: Record<string, (p: { size?: number }) => JSX.Element> = {
  spark: IconSpark,
  script: IconScript,
  filmstrip: IconFilmStrip,
  image: IconImage,
  character: IconCharacter,
  video: IconVideo,
  cube: IconCube,
  music: IconMusic,
  text: IconText,
};

export default function Agents() {
  const nav = useNavigate();
  const { settings, addNode, updateNodePayload, saveCurrent, project } = useStudio();
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [toast, setToast] = useState("");

  // ——— 电影级基座（Hell Grind 语法）状态 ———
  const [cine, setCine] = useState<CineShotInput>({});
  const [useFoundation, setUseFoundation] = useState(true);
  const [constraintKeys, setConstraintKeys] = useState<string[]>([]);
  const [showBase, setShowBase] = useState(false);

  const isCine = agentId === "cine-prompt";

  const setCineField = (k: keyof CineShotInput, v: string) =>
    setCine((c) => ({ ...c, [k]: v }));

  const toggleConstraint = (k: string) =>
    setConstraintKeys((arr) => (arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]));

  // 装配（离线/实时都用同一套骨架）
  const assembleCine = () => {
    const text = buildCinePrompt(cine, { withFoundation: useFoundation, constraints: constraintKeys });
    setPrompt(text);
    setOutput(text);
    setDemo(true);
  };

  const agent = getAgent(agentId)!;
  const grouped = useMemo(
    () =>
      CATEGORIES.map((cat) => ({ cat, items: AGENTS.filter((a) => a.category === cat) })).filter(
        (g) => g.items.length > 0
      ),
    []
  );

  const run = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setOutput("");
    try {
      const r = await runAgent(agentId, prompt, settings);
      setOutput(r.text);
      setDemo(r.demo);
    } catch (e) {
      setOutput("生成失败：" + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setToast("已复制到剪贴板");
    } catch {
      setToast("复制失败，请手动选择文本");
    }
  };

  const sendToCanvas = () => {
    if (!output) return;
    if (!project) {
      setToast("请先在「创作」中打开一个项目，再发送（已为你复制）");
      copy();
      return;
    }
    const id = addNode("text", { x: 120 + Math.random() * 240, y: 120 + Math.random() * 160 });
    updateNodePayload(id, { note: `【${agent.name}】\n${output}` });
    saveCurrent();
    setToast("已发送到画布（文本节点）");
    setTimeout(() => nav("/studio"), 600);
  };

  return (
    <div className="agents">
      {/* 左：分类 Agent 列表 */}
      <aside className="agents__side">
        <div className="agents__side-head">
          <IconDirector size={16} />
          <span>专业 Agent</span>
          <span className="agents__count">{AGENTS.length}</span>
        </div>
        <div className="agents__list">
          {grouped.map((g) => (
            <div key={g.cat} className="agents__group">
              <div className="agents__group-title">{g.cat}</div>
              {g.items.map((a) => {
                const Ico = ICONS[a.icon] || IconSpark;
                return (
                  <button
                    key={a.id}
                    className="agent-item"
                    data-active={a.id === agentId}
                    onClick={() => setAgentId(a.id)}
                  >
                    <span className="agent-item__icon"><Ico size={16} /></span>
                    <span className="agent-item__body">
                      <span className="agent-item__name">{a.name}</span>
                      <span className="agent-item__tag">{a.tagline}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* 右：IO 面板 */}
      <section className="agents__main">
        <header className="agents__head">
          <span className="agents__head-icon"><IconSpark size={18} /></span>
          <div>
            <h2>{agent.name}</h2>
            <p>{agent.tagline}</p>
          </div>
          {demo && <span className="agents__badge">DEMO 回退</span>}
        </header>

        <div className="agents__io">
          {/* 电影级基座面板（Hell Grind 12 行 + 约束预设） */}
          <div className="cine-base">
            <button className="cine-base__toggle" onClick={() => setShowBase((s) => !s)}>
              <IconLink size={14} />
              <span>电影级基座 · Hell Grind 院线语法</span>
              <span className="cine-base__chev">{showBase ? "▾" : "▸"}</span>
            </button>
            {showBase && (
              <div className="cine-base__panel">
                <div className="cine-base__row">
                  <span className="cine-base__title">12 行技术底座（逐字粘贴到每条镜头提示词末尾）</span>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(CINEMATIC_FOUNDATION.join("\n")).then(() => setToast("已复制 12 行底座"))}>复制全部</Button>
                </div>
                <ol className="cine-base__list">
                  {CINEMATIC_FOUNDATION.map((l, i) => (
                    <li key={i}><code>{l}</code><button className="cine-base__copy" onClick={() => navigator.clipboard.writeText(l).then(() => setToast("已复制该行"))}>复制</button></li>
                  ))}
                </ol>
                <div className="cine-base__title" style={{ marginTop: 10 }}>约束预设（给模型更少自由）</div>
                <div className="cine-base__chips">
                  {CINE_CONSTRAINTS.map((c) => (
                    <span key={c.key} className="cine-chip" title={c.desc}>{c.label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* cine-prompt 结构化表单 */}
          {isCine ? (
            <div className="cine-form">
              <div className="agents__label">镜头装配表单（7 段骨架，按电影语法拼装）</div>
              {SHOT_SKELETON.map((s) => (
                <div className="cine-form__field" key={s.key}>
                  <label title={s.desc}>{s.label} <em>{s.weight}</em></label>
                  <textarea
                    className="agents__input"
                    rows={s.key === "action" ? 4 : 2}
                    placeholder={s.desc}
                    value={(cine as any)[s.key] || ""}
                    onChange={(e) => setCineField(s.key as keyof CineShotInput, e.target.value)}
                  />
                </div>
              ))}
              <div className="cine-form__opts">
                <label className="cine-form__check">
                  <input type="checkbox" checked={useFoundation} onChange={(e) => setUseFoundation(e.target.checked)} />
                  附带 12 行技术底座
                </label>
                <div className="cine-form__cons">
                  {CINE_CONSTRAINTS.map((c) => (
                    <button
                      key={c.key}
                      className="cine-chip"
                      data-active={constraintKeys.includes(c.key)}
                      title={c.desc}
                      onClick={() => toggleConstraint(c.key)}
                    >{c.label}</button>
                  ))}
                </div>
              </div>
              <div className="agents__actions">
                <Button variant="primary" onClick={assembleCine} disabled={!cine.intent && !cine.state}>
                  装配成片提示词
                </Button>
                <Button variant="ghost" onClick={run} disabled={loading || !prompt.trim()}>
                  {loading ? "大模型精修中…" : "大模型精修 / 翻译"}
                </Button>
                {loading && <Spinner size={16} />}
              </div>
            </div>
          ) : (
            <>
              <label className="agents__label">你的需求 / 创意简报</label>
              <textarea
                className="agents__input"
                placeholder="例如：一个赛博朋克女黑客在雨夜天台对峙反派的电影感镜头"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
              />
              <div className="agents__actions">
                <Button variant="primary" onClick={run} disabled={loading || !prompt.trim()}>
                  {loading ? "生成中…" : "生成专业内容"}
                </Button>
                {loading && <Spinner size={16} />}
                <span className="agents__hint">配置 API 网关后由真实大模型生成；未配置自动回退本地模板。</span>
              </div>
            </>
          )}

          {output && (
            <div className="agents__result">
              <div className="agents__result-head">
                <span>输出</span>
                <div className="agents__result-btns">
                  <IconButton title="复制到剪贴板" onClick={copy}>
                    <IconDuplicate size={15} />
                  </IconButton>
                  <Button variant="ghost" size="sm" onClick={sendToCanvas}>发送到画布</Button>
                </div>
              </div>
              <pre className="agents__output">{output}</pre>
            </div>
          )}
        </div>
        {toast && <div className="agents__toast" onClick={() => setToast("")}>{toast}</div>}
      </section>
    </div>
  );
}
