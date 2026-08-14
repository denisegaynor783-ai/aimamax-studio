// ============================================================
// AIMAMAX Studio — 我的项目
// ============================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as db from "../lib/db";
import type { Project } from "../lib/types";
import { Button, EmptyState, Modal, Field, IconButton } from "../components/ui";
import { NewProjectModal } from "../components/NewProjectModal";
import { IconProjects, IconPlus, IconTrash, IconCreate, IconFilm } from "../components/icons";

const KIND_LABEL: Record<string, string> = {
  film: "短片", comic: "漫剧", ad: "广告", musicvideo: "MV", blank: "空白",
};

export default function Projects() {
  const nav = useNavigate();
  const [list, setList] = useState<Project[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [name, setName] = useState("");

  const reload = () => db.listProjects().then(setList);
  useEffect(() => { reload(); }, []);

  const open = async (p: Project) => {
    await db.getProject(p.id); // ensure exists
    nav(`/studio?p=${p.id}`);
  };

  return (
    <div className="content">
      <div className="page-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">PROJECTS</div>
          <h1>我的项目</h1>
          <p>所有项目存于本地浏览器（IndexedDB），离线可用、刷新不丢。点击卡片进入导演画布。</p>
        </div>
        <Button variant="primary" icon={<IconPlus size={16} />} onClick={() => setShowNew(true)}>新建项目</Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<IconProjects size={28} />}
          title="还没有项目"
          hint="从模板新建一个导演项目，开始你的 AI 影视 / 漫剧创作。"
          action={<Button variant="primary" icon={<IconPlus size={16} />} onClick={() => setShowNew(true)}>新建项目</Button>}
        />
      ) : (
        <div className="grid grid--cards">
          {list.map((p) => (
            <div key={p.id} className="proj-card" onClick={() => open(p)}>
              <div className="proj-card__thumb">
                {p.thumb ? <img src={p.thumb} alt={p.name} /> : <IconFilm size={32} />}
              </div>
              <div className="proj-card__meta">
                <div style={{ minWidth: 0 }}>
                  <div className="proj-card__name truncate">{p.name}</div>
                  <div className="proj-card__sub">{KIND_LABEL[p.kind] ?? p.kind} · {new Date(p.updatedAt).toLocaleString("zh-CN")}</div>
                </div>
              </div>
              <div className="proj-card__menu">
                <IconButton
                  title="重命名"
                  onClick={(e) => { e.stopPropagation(); setRenaming(p); setName(p.name); }}
                >
                  <IconCreate size={16} />
                </IconButton>
                <IconButton
                  title="删除"
                  onClick={(e) => { e.stopPropagation(); setDeleting(p); }}
                >
                  <IconTrash size={16} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => { setShowNew(false); reload(); }} />}

      {renaming && (
        <Modal title="重命名项目" onClose={() => setRenaming(null)}>
          <Field label="项目名称">
            <input className="input" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setRenaming(null)}>取消</Button>
            <Button variant="primary" onClick={async () => { await db.renameProject(renaming.id, name.trim() || renaming.name); setRenaming(null); reload(); }}>保存</Button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="确认删除" onClose={() => setDeleting(null)}>
          <p style={{ color: "var(--text-dim)" }}>将永久删除 <b style={{ color: "var(--signal)" }}>{deleting.name}</b>，此操作不可恢复。</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setDeleting(null)}>取消</Button>
            <Button variant="danger" onClick={async () => { await db.deleteProject(deleting.id); setDeleting(null); reload(); }}>删除</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
