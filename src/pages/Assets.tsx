// ============================================================
// AIMAMAX Studio — 资产库
// 复用角色 / 场景 / 素材 / 音乐 / 风格；可一键送回画布。
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as db from "../lib/db";
import { useStudio } from "../lib/store";
import { Button, EmptyState, Badge, IconButton } from "../components/ui";
import { IconAssets, IconTrash, IconPlus, IconCreate } from "../components/icons";
import type { Asset, AssetKind, NodeKind } from "../lib/types";

const KIND_LABEL: Record<AssetKind, string> = {
  character: "角色", scene: "场景", prop: "素材", music: "音乐", style: "风格",
};
const FILTERS: { k: AssetKind | "all"; label: string }[] = [
  { k: "all", label: "全部" },
  { k: "character", label: "角色" },
  { k: "scene", label: "场景" },
  { k: "prop", label: "素材" },
  { k: "music", label: "音乐" },
  { k: "style", label: "风格" },
];

function toNodeKind(k: AssetKind): NodeKind {
  if (k === "character") return "character";
  if (k === "scene") return "scene";
  if (k === "music") return "music";
  return "asset";
}

export default function Assets() {
  const nav = useNavigate();
  const { project, addNode, updateNodePayload } = useStudio();
  const [list, setList] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<AssetKind | "all">("all");

  const reload = () => db.listAssets().then(setList);
  useEffect(() => { reload(); }, []);

  const shown = useMemo(() => (filter === "all" ? list : list.filter((a) => a.kind === filter)), [list, filter]);

  const sendToCanvas = (a: Asset) => {
    if (!project) { nav("/projects"); return; }
    const id = addNode(toNodeKind(a.kind), { x: 80 + Math.random() * 240, y: 80 + Math.random() * 200 });
    updateNodePayload(id, { note: a.name, results: a.preview ? [{ id: a.id, kind: "image", status: "success", url: a.preview, createdAt: a.createdAt }] : [] });
    nav("/studio");
  };

  return (
    <div className="content">
      <div className="page-head">
        <div className="eyebrow">ASSET LIBRARY</div>
        <h1>资产库</h1>
        <p>从画布生成结果「收藏到资产」，或在画布外累积可复用素材。点击「送回画布」即可在导演台复用。</p>
      </div>

      <div className="toolrow" style={{ marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <Button key={f.k} variant={filter === f.k ? "primary" : "ghost"} size="sm" onClick={() => setFilter(f.k)}>
            {f.label}
          </Button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<IconAssets size={28} />}
          title="资产库还是空的"
          hint="在创作画布中生成图像 / 视频后，用节点上的「收藏」按钮把结果沉淀到资产库，跨项目复用。"
        />
      ) : shown.length === 0 ? (
        <div className="faint" style={{ padding: 24 }}>该分类下暂无资产。</div>
      ) : (
        <div className="grid grid--cards">
          {shown.map((a) => (
            <div key={a.id} className="asset-card">
              <div className="asset-card__thumb">
                {a.preview ? <img src={a.preview} alt={a.name} /> : <IconAssets size={26} />}
              </div>
              <div className="asset-card__meta">
                <div style={{ minWidth: 0 }}>
                  <div className="asset-card__name truncate">{a.name}</div>
                  <Badge tone="ghost">{KIND_LABEL[a.kind]}</Badge>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <IconButton title="送回画布" onClick={() => sendToCanvas(a)}>
                    <IconPlus size={16} />
                  </IconButton>
                  <IconButton title="删除" onClick={async () => { await db.deleteAsset(a.id); reload(); }}>
                    <IconTrash size={16} />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!project && (
        <div className="panel" style={{ marginTop: 20, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <IconCreate size={20} />
          <span className="dim" style={{ flex: 1, fontSize: 13 }}>提示：先打开一个项目，才能把资产送回画布节点。</span>
          <Button size="sm" variant="ghost" onClick={() => nav("/projects")}>打开项目</Button>
        </div>
      )}
    </div>
  );
}
