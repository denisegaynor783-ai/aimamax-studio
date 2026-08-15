// ============================================================
// AIMAMAX Studio — 新建项目弹窗
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudio } from "../lib/store";
import { Modal, Button, Field } from "./ui";
import { IconFilm, IconCreate, IconVideo, IconMusic, IconText } from "./icons";
import type { ProjectKind } from "../lib/types";

const KINDS: { kind: ProjectKind; label: string; icon: (p: { size?: number }) => JSX.Element; desc: string }[] = [
  { kind: "film", label: "短片 / 微电影", icon: IconFilm, desc: "叙事镜头 + 分镜 + 配乐" },
  { kind: "comic", label: "漫剧 / 动态漫画", icon: IconCreate, desc: "分格漫画 + 角色一致性" },
  { kind: "ad", label: "广告 / 短片", icon: IconVideo, desc: "卖点脚本 + 视觉分镜" },
  { kind: "musicvideo", label: "MV / 音乐视觉", icon: IconMusic, desc: "节拍分镜 + 动态视觉" },
  { kind: "blank", label: "空白画布", icon: IconText, desc: "从零自由编排" },
];

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const { createProject } = useStudio();
  const [kind, setKind] = useState<ProjectKind>("film");
  const [name, setName] = useState("");

  const go = async () => {
    const id = await createProject(kind, name);
    onClose();
    nav(`/studio?p=${id}`);
  };

  return (
    <Modal title="新建导演项目" onClose={onClose}>
      <div className="grid grid--cards" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
        {KINDS.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.kind}
              className="tpl-card tpl-card--compact"
              data-active={kind === k.kind}
              onClick={() => setKind(k.kind)}
              style={kind === k.kind ? { borderColor: "var(--film)", boxShadow: "var(--glow-film)" } : undefined}
            >
              <div className="tpl-card__icon"><Icon size={18} /></div>
              <h3>{k.label}</h3>
              <p>{k.desc}</p>
            </button>
          );
        })}
      </div>
      <Field label="项目名称（可选）">
        <input className="input" placeholder="留空则自动命名" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={go}>创建并进入画布</Button>
      </div>
    </Modal>
  );
}
