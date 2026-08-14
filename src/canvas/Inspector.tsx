// ============================================================
// AIMAMAX Studio — 检视器（右侧）：编辑选中节点 / 触发生成 / 结果画廊
// ============================================================
import { useStudio } from "../lib/store";
import { Button, IconButton, Field, Badge, EmptyState, Spinner } from "../components/ui";
import { IconTrash, IconSpark, IconImage, IconVideo, IconText, IconPlus, IconChevron } from "../components/icons";
import type { AssetKind, GenKind, NodeKind, ProviderConfig } from "../lib/types";

const KIND_LABEL: Record<NodeKind, string> = {
  character: "角色卡", scene: "场景卡", shot: "分镜格", asset: "素材", prompt: "生成任务", music: "音乐轨", text: "文本 / 脚本",
};

function assetKindOf(k: NodeKind): AssetKind {
  if (k === "character") return "character";
  if (k === "scene") return "scene";
  if (k === "music") return "music";
  return "prop";
}

export function Inspector({ onCollapse }: { onCollapse?: () => void }) {
  const { selectedNodeId, nodes, settings, updateNodeData, updateNodePayload, generateFromNode, deleteNode, addAsset, busy, busyNodeId } =
    useStudio();
  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="inspector">
        <div className="inspector__empty">
          <EmptyState
            icon={<IconSpark size={26} />}
            title="未选中节点"
            hint="在画布上点选一个节点以编辑内容、触发 AI 生成并查看结果。"
          />
        </div>
      </div>
    );
  }

  const d = node.data;
  const providers = settings.providers;
  // 选中接口（Provider）：节点显式指定优先，否则跟随默认
  const chosenProv = providers.find((p: ProviderConfig) => p.id === d.payload.provider);
  const busyThis = busy && busyNodeId === node.id;
  const isVisual = d.kind !== "text" && d.kind !== "music";
  const isAudio = d.kind === "music";

  const collect = async (url?: string, text?: string) => {
    await addAsset({
      id: crypto.randomUUID(),
      kind: assetKindOf(d.kind),
      name: d.label,
      preview: url,
      sourceNodeId: node.id,
      tags: [d.kind],
      createdAt: Date.now(),
    });
    alert(text ? "文本已收藏到资产库" : "已收藏到资产库");
  };

  const gen = (kind: GenKind, model?: string) => generateFromNode(node.id, kind, model);

  return (
    <div className="inspector">
      <div className="inspector__head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Badge tone="film">{KIND_LABEL[d.kind]}</Badge>
          <div style={{ display: "flex", gap: 4 }}>
            {onCollapse && (
              <IconButton title="收起检视器" onClick={onCollapse}>
                <IconChevron size={16} />
              </IconButton>
            )}
            <IconButton title="删除节点" onClick={() => deleteNode(node.id)}>
              <IconTrash size={16} />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="inspector__body">
        <Field label="名称">
          <input className="input" value={d.label} onChange={(e) => updateNodeData(node.id, { label: e.target.value })} />
        </Field>

        <Field label={isAudio ? "音乐描述 / 参考" : d.kind === "text" ? "脚本 / 提示词" : "生成提示词 (Prompt)"}>
          <textarea
            className="textarea"
            value={d.payload.prompt ?? ""}
            placeholder={isAudio ? "描述想要的配乐情绪、节奏、乐器…" : "描述你想要的画面或内容"}
            onChange={(e) => updateNodePayload(node.id, { prompt: e.target.value })}
          />
        </Field>

        {isVisual && (
          <Field label="反向提示词 (Negative)">
            <input className="input" value={d.payload.negativePrompt ?? ""} onChange={(e) => updateNodePayload(node.id, { negativePrompt: e.target.value })} />
          </Field>
        )}

        {/* —— 接口 (Provider) + 大模型 (Model) 全量暴露 —— */}
        <Field label="接口 (Provider)">
          <select
            className="select"
            value={d.payload.provider ?? ""}
            onChange={(e) => {
              // 切换接口时清空已选模型，避免模型来自不同供应商
              updateNodePayload(node.id, { provider: e.target.value || undefined, model: undefined });
            }}
          >
            <option value="">（跟随默认）</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.kind === "demo" ? "" : p.enabled ? "" : " · 未启用"}
              </option>
            ))}
          </select>
        </Field>

        <Field label="大模型 (Model)">
          <select
            className="select"
            value={d.payload.model ?? ""}
            onChange={(e) => updateNodePayload(node.id, { model: e.target.value || undefined })}
          >
            <option value="">（跟随默认）</option>
            {chosenProv ? (
              // 已选具体接口：列出该接口的全部模型
              chosenProv.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))
            ) : (
              // 未指定接口：按供应商分组列出所有模型，全部可点选
              providers.map((p) => (
                <optgroup key={p.id} label={p.name}>
                  {p.models.map((m) => (
                    <option key={p.id + "::" + m} value={m}>{m}</option>
                  ))}
                </optgroup>
              ))
            )}
          </select>
        </Field>

        {/* 接口状态提示：地址 + 密钥 */}
        <div className="inspector__prov-hint">
          <span className="dot" data-ok={chosenProv ? chosenProv.kind === "demo" || !!chosenProv.apiKey : false} />
          {chosenProv ? (
            chosenProv.kind === "demo" ? (
              <span>离线 Demo 引擎 · 无需密钥</span>
            ) : chosenProv.apiKey ? (
              <span>已配置密钥 · {chosenProv.baseUrl || "默认端点"}</span>
            ) : (
              <span>未配置密钥 · {chosenProv.baseUrl || "默认端点"}（将回退 Demo）</span>
            )
          ) : (
            <span>未指定接口 · 将按运行模式/默认供应商选择</span>
          )}
        </div>

        {isVisual && (
          <Field label="尺寸">
            <select className="select" value={(d.payload.params?.size as string) ?? "1024x1024"} onChange={(e) => updateNodePayload(node.id, { params: { ...d.payload.params, size: e.target.value } })}>
              <option value="1024x1024">1024 × 1024（方）</option>
              <option value="1344x768">1344 × 768（横）</option>
              <option value="768x1344">768 × 1344（竖）</option>
            </select>
          </Field>
        )}

        {/* 生成操作 */}
        <div style={{ display: "flex", gap: 8, margin: "6px 0 18px" }}>
          {isVisual && (
            <Button variant="primary" size="sm" block icon={<IconImage size={14} />} disabled={busyThis} onClick={() => gen("image", d.payload.model)}>
              {busyThis ? <Spinner size={13} /> : "出图"}
            </Button>
          )}
          {isVisual && (
            <Button variant="ghost" size="sm" block icon={<IconVideo size={14} />} disabled={busyThis} onClick={() => gen("video", d.payload.model)}>
              出视频
            </Button>
          )}
          {!isAudio && (
            <Button variant="ghost" size="sm" block icon={<IconText size={14} />} disabled={busyThis} onClick={() => gen("text", d.payload.model)}>
              出文
            </Button>
          )}
          {isAudio && (
            <Button variant="primary" size="sm" block icon={<IconSpark size={14} />} disabled={busyThis} onClick={() => gen("text", d.payload.model)}>
              {busyThis ? <Spinner size={13} /> : "生成配乐描述"}
            </Button>
          )}
        </div>

        {/* 结果画廊 */}
        <div className="eyebrow" style={{ marginBottom: 8 }}>生成结果 ({d.payload.results?.length ?? 0})</div>
        {!d.payload.results || d.payload.results.length === 0 ? (
          <div className="faint" style={{ fontSize: 12 }}>还没有结果。点击上方按钮生成。</div>
        ) : (
          <div className="result-grid">
            {d.payload.results.map((r) => (
              <div key={r.id} className="result-card">
                <div className="result-card__bar">
                  {r.url && (
                    <IconButton title="收藏到资产" onClick={() => collect(r.url)} style={{ background: "rgba(10,10,14,0.7)" }}>
                      <IconPlus size={13} />
                    </IconButton>
                  )}
                  {r.text && (
                    <IconButton title="收藏到资产" onClick={() => collect(undefined, r.text)} style={{ background: "rgba(10,10,14,0.7)" }}>
                      <IconPlus size={13} />
                    </IconButton>
                  )}
                </div>
                {r.url && (r.kind === "video" ? (
                  <video src={r.url} controls loop muted playsInline style={{ width: "100%", display: "block" }} />
                ) : (
                  <img src={r.url} alt="" />
                ))}
                {r.text && <div className="result-card__txt">{r.text}</div>}
                {r.error && <div className="result-card__txt" style={{ color: "var(--signal)" }}>{r.error}</div>}
              </div>
            ))}
          </div>
        )}

        {d.payload.note && d.kind === "text" && (
          <Field label="备注">
            <textarea className="textarea" value={d.payload.note} onChange={(e) => updateNodePayload(node.id, { note: e.target.value })} />
          </Field>
        )}
      </div>
    </div>
  );
}
