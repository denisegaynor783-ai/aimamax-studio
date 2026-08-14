// ============================================================
// AIMAMAX Studio — 发现（落地页）
// ============================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as db from "../lib/db";
import { useStudio } from "../lib/store";
import { Button } from "../components/ui";
import { NewProjectModal } from "../components/NewProjectModal";
import { IconFilm, IconCreate, IconVideo, IconMusic, IconText, IconProjects, IconPlus, IconSpark } from "../components/icons";
import type { Project, ProjectKind } from "../lib/types";

const TEMPLATES: { kind: ProjectKind; label: string; icon: (p: { size?: number }) => JSX.Element; desc: string }[] = [
  { kind: "film", label: "短片 / 微电影", icon: IconFilm, desc: "叙事镜头 · 分镜 · 配乐" },
  { kind: "comic", label: "漫剧 / 动态漫画", icon: IconCreate, desc: "分格 · 角色一致性" },
  { kind: "ad", label: "广告 / 宣传片", icon: IconVideo, desc: "卖点脚本 · 视觉分镜" },
  { kind: "musicvideo", label: "MV / 音乐视觉", icon: IconMusic, desc: "节拍分镜 · 动态视觉" },
  { kind: "blank", label: "空白画布", icon: IconText, desc: "从零自由编排" },
];

const KIND_LABEL: Record<string, string> = {
  film: "短片", comic: "漫剧", ad: "广告", musicvideo: "MV", blank: "空白",
};

export default function Discover() {
  const nav = useNavigate();
  const { createProject } = useStudio();
  const [recent, setRecent] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);

  const reload = () => db.listProjects().then((l) => setRecent(l.slice(0, 6)));
  useEffect(() => { reload(); }, []);

  const startTemplate = async (kind: ProjectKind) => {
    const id = await createProject(kind);
    nav(`/studio?p=${id}`);
  };

  const open = (p: Project) => nav(`/studio?p=${p.id}`);

  return (
    <div className="content">
      {/* Hero */}
      <section className="hero">
        <div className="hero__eyebrow">AI FILM · COMIC DIRECTOR WORKBENCH</div>
        <h1>
          把灵感<span className="accent">拖</span>成一部片。<br />
          无限画布上的 <span className="accent">导演台</span>。
        </h1>
        <p>
          AIMAMAX Studio 是一块为 AI 影视 / 漫剧而生的无限画布：角色、场景、分镜、生成任务、音乐轨自由编排，
          连线表达镜头衔接，AI 节点就地出图 / 出片 / 出剧本，一键导出工程与分镜表。
        </p>
        <div className="hero__actions">
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={() => setShowNew(true)}>新建项目</Button>
          <Button variant="ghost" icon={<IconProjects size={16} />} onClick={() => nav("/projects")}>我的项目</Button>
        </div>
        <div className="hero__stat">
          <div><b>∞</b><br /><span>无限画布</span></div>
          <div><b>7</b><br /><span>语义节点</span></div>
          <div><b>3</b><br /><span>生成模态</span></div>
          <div><b>0</b><br /><span>服务器依赖</span></div>
        </div>
      </section>

      {/* 模板 */}
      <div className="section-head">
        <h2>从模板开始</h2>
        <span className="faint" style={{ fontSize: 12 }}>点击任一切片，即刻进入画布</span>
      </div>
      <div className="grid grid--cards">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.kind} className="tpl-card" onClick={() => startTemplate(t.kind)}>
              <div className="tpl-card__icon"><Icon size={22} /></div>
              <h3>{t.label}</h3>
              <p>{t.desc}</p>
            </div>
          );
        })}
      </div>

      {/* 最近 */}
      <div className="section-head">
        <h2>最近项目</h2>
        <a onClick={() => nav("/projects")}>查看全部 →</a>
      </div>
      {recent.length === 0 ? (
        <div className="panel" style={{ padding: 28, textAlign: "center", color: "var(--text-faint)" }}>
          <IconSpark size={26} />
          <div style={{ marginTop: 10 }}>还没有项目，从上方模板或「新建项目」开始。</div>
        </div>
      ) : (
        <div className="grid grid--cards">
          {recent.map((p) => (
            <div key={p.id} className="proj-card" onClick={() => open(p)}>
              <div className="proj-card__thumb">{p.thumb ? <img src={p.thumb} alt={p.name} /> : <IconFilm size={30} />}</div>
              <div className="proj-card__meta">
                <div style={{ minWidth: 0 }}>
                  <div className="proj-card__name truncate">{p.name}</div>
                  <div className="proj-card__sub">{KIND_LABEL[p.kind] ?? p.kind} · {new Date(p.updatedAt).toLocaleDateString("zh-CN")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => { setShowNew(false); reload(); }} />}
    </div>
  );
}
