// ============================================================
// AIMAMAX Studio — 节点浮动功能菜单（统一：工具条「添加节点」与此菜单共享同一面板）
// 吸附于选中节点旁或右击位置，提供：
//   节点操作（复制/转生成器/结果→素材/智能剪辑/逐帧拉片/智能分镜）
//   添加节点（与工具条完全一致：NODE_PALETTE + QUICK_GEN）
//   脚本› / 素材库›（子面板）/ 批量操作 / 添加资源（上传）/ 工作台（导演台）
// 所有菜单项均为真实可用功能，无占位空函数。
// ============================================================
import { useCallback, useRef, useState } from "react";
import { useStudio } from "../lib/store";
import { useReactFlow } from "@xyflow/react";
import {
  IconScript, IconAssets, IconUpload, IconHistory, IconPlus, IconLayers,
  IconDuplicate, IconTrash, IconChevronUp, IconDirector, IconScissors, IconFilmStrip,
  IconLink2, IconSpark, IconImage,
} from "../components/icons";
import type { NodeKind } from "../lib/types";
import { NODE_PALETTE, QUICK_GEN } from "./palette";

/* ── 菜单项定义 ── */
interface MenuItem {
  icon: (p: { size?: number }) => React.ReactNode;
  label: string;
  badge?: string;
  badgeTone?: "signal" | "ok" | "info" | "ghost" | "film";
  action: () => void;
  submenu?: "script" | "asset";
  dividerBefore?: boolean;
}

/* ── Badge 小标签 ── */
function Badge({ tone = "ghost", children }: { tone?: string; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    signal: "var(--signal)", ok: "var(--ok)", info: "var(--info)",
    ghost: "var(--text-dim)", film: "var(--film)",
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
      padding: "1px 6px", borderRadius: 4,
      background: `${tones[tone] || tones.ghost}18`, color: tones[tone] || tones.ghost,
      marginLeft: 4,
    }}>
      {children}
    </span>
  );
}

/* ── 主组件 ── */
export function NodeActionMenu({ nodeId, position, screenPos }: { nodeId: string; position: { x: number; y: number }; screenPos?: { x: number; y: number } }) {
  const rf = useReactFlow();
  const { addNode, generateFromNode, nodes, assets, genHistory, connectRel } = useStudio();
  const node = nodes.find((n) => n.id === nodeId);
  const isGroup = node?.data.kind === "group";
  const hasResult = !!node && (node.data.payload.results ?? []).some((r) => r.status === "success" && r.url);

  const menuRef = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<"script" | "asset" | "history" | null>(null);
  const [subTop, setSubTop] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // 选中节点正下方偏右生成新节点（返回新建 id）
  const addAtNode = useCallback(
    (kind: NodeKind): string | null => {
      if (!node) return null;
      const offX = 260;
      const offY = 20;
      return addNode(kind, { x: node.position.x + offX, y: node.position.y + offY });
    },
    [node, addNode]
  );

  // 空白处右击：在鼠标位置生成新节点
  const addAtPane = useCallback(
    (kind: NodeKind): string | null => {
      if (!screenPos) return null;
      const p = rf.screenToFlowPosition({ x: screenPos.x, y: screenPos.y });
      return addNode(kind, { x: p.x, y: p.y });
    },
    [screenPos, rf, addNode]
  );

  // 统一入口：节点存在则贴着节点，否则落在空白处
  const addNear = useCallback((kind: NodeKind): string | null => (node ? addAtNode(kind) : addAtPane(kind)),
    [node, addAtNode, addAtPane]);

  // 快捷生成：新建分镜格并立即出图 / 出视频（自动连回当前节点，让上下文流过）
  const quickGen = useCallback(
    (gen: "image" | "video") => {
      const id = addNear("shot");
      if (!id) return;
      if (node) connectRel(node.id, id, "reference");
      generateFromNode(id, gen);
    },
    [addNear, node, connectRel, generateFromNode]
  );

  // 智能剪辑：在当前节点下游新建分镜格并出视频（剪辑成可生成的镜头）
  const smartClip = useCallback(() => {
    const id = addAtNode("shot");
    if (!id || !node) return;
    connectRel(node.id, id, "reference");
    generateFromNode(id, "video");
  }, [addAtNode, node, connectRel, generateFromNode]);

  // 逐帧拉片：以当前节点为源，派生 3 个并排分镜格（帧条），方便逐帧编排
  const frameStrip = useCallback(() => {
    if (!node) return;
    const baseX = node.position.x + 260;
    const baseY = node.position.y;
    let prevId: string | null = null;
    for (let i = 0; i < 3; i++) {
      const id = addNode("shot", { x: baseX + i * 300, y: baseY + i * 8 });
      if (prevId) connectRel(prevId, id, "sequence");
      else connectRel(node.id, id, "reference");
      useStudio.getState().updateNodePayload(id, { note: `帧 ${i + 1}` });
      prevId = id;
    }
  }, [node, addNode, connectRel]);

  // 上传本地图片 → 落为素材节点（离线可用）
  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const pos = node ? { x: node.position.x + 260, y: node.position.y + 20 } : (screenPos ? rf.screenToFlowPosition({ x: screenPos.x, y: screenPos.y }) : { x: 120, y: 120 });
        const id = addNode("asset", pos);
        if (id) useStudio.getState().updateNodePayload(id, { results: [{ status: "success", url }], note: file.name });
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [node, screenPos, rf, addNode]
  );

  // 定位：优先使用屏幕坐标（右击菜单），否则从 flow 坐标转换
  const menuPos = screenPos ?? rf.flowToScreenPosition({
    x: position.x + 240,
    y: position.y,
  });

  const closeSub = () => { setOpenSub(null); setImportOpen(false); setImportText(""); };

  // ── 节点操作（仅选中真实节点时） ──
  const nodeOps: MenuItem[] = !node || isGroup ? [] : (() => {
    const ops: MenuItem[] = [
      { icon: IconDuplicate, label: "复制节点", action: () => useStudio.getState().duplicateNode(nodeId) },
      { icon: IconTrash, label: "删除节点", action: () => useStudio.getState().deleteNode(nodeId) },
    ];
    if (hasResult) {
      ops.push({ icon: IconLink2, label: "转生成器", action: () => useStudio.getState().assetToGenerator(nodeId) });
      ops.push({ icon: IconImage, label: "结果 → 素材", action: () => useStudio.getState().resultToAssetNode(nodeId) });
    }
    if (node.data.kind === "text") {
      ops.push({ icon: IconSpark, label: "智能分镜", action: () => useStudio.getState().storyboardFromText(nodeId) });
    }
    ops.push({ icon: IconScissors, label: "智能剪辑", badge: "Beta", badgeTone: "ghost", action: smartClip });
    ops.push({ icon: IconFilmStrip, label: "逐帧拉片", badge: "💎", badgeTone: "film", action: frameStrip });
    return ops;
  })();

  // ── 添加节点（与工具条「添加节点」完全一致） ──
  const addItems: MenuItem[] = [
    ...NODE_PALETTE.map((k): MenuItem => ({
      icon: k.icon,
      label: k.label,
      action: () => addNear(k.kind),
    })),
    ...QUICK_GEN.map((q): MenuItem => ({
      icon: q.icon,
      label: q.label,
      dividerBefore: q === QUICK_GEN[0],
      action: () => quickGen(q.gen),
    })),
  ];

  // ── 批量操作 ──
  const batchItems: MenuItem[] = [
    { icon: IconLayers, label: "编组选中", action: () => { const s = useStudio.getState(); const ids = s.nodes.filter((x) => (x as unknown as { selected?: boolean }).selected).map((x) => x.id); s.groupNodes(ids.length ? ids : undefined); } },
    { icon: IconDuplicate, label: "复制选中", action: () => { useStudio.getState().copySelection(); } },
    { icon: IconPlus, label: "粘贴", action: () => { useStudio.getState().pasteClipboard(); } },
    { icon: IconTrash, label: "删除选中", action: () => { useStudio.getState().deleteSelected(); } },
  ];

  // ── 分组节点菜单 ──
  const groupItems: MenuItem[] = [
    { icon: IconChevronUp, label: node?.data.payload.collapsed ? "展开分组" : "折叠分组", action: () => useStudio.getState().toggleGroup(nodeId) },
    { icon: IconLayers, label: "解组", action: () => useStudio.getState().ungroupNodes(nodeId) },
    { icon: IconDuplicate, label: "复制选中", action: () => { useStudio.getState().copySelection(); } },
    { icon: IconTrash, label: "删除选中", action: () => { useStudio.getState().deleteSelected(); } },
  ];

  const sections: { title: string | null; items: MenuItem[] }[] = isGroup
    ? [{ title: null, items: groupItems }]
    : [
        ...(nodeOps.length ? [{ title: "节点操作", items: nodeOps }] : []),
        { title: "添加节点", items: addItems },
        { title: null, items: [{ icon: IconScript, label: "脚本", submenu: "script" } as MenuItem, { icon: IconAssets, label: "素材库", submenu: "asset" } as MenuItem] },
        { title: "批量操作", items: batchItems },
        { title: "添加资源", items: [{ icon: IconUpload, label: "上传图片", action: () => fileRef.current?.click() }, { icon: IconHistory, label: "从生成历史选择", action: () => setOpenSub("history") }] },
        { title: "工作台", items: [{ icon: IconDirector, label: "进入 3D 导演台", badge: "NEW", badgeTone: "ok", action: () => useStudio.getState().setStudioMode("stage") }] },
      ];

  return (
    <>
      <div
        className="node-action-menu"
        ref={menuRef}
        style={{
          left: menuPos.x,
          top: menuPos.y,
        }}
      >
        {sections.map((sec, si) => (
          <div key={si}>
            {sec.title && <div className="node-action-menu__sec">{sec.title}</div>}
            {sec.items.map((item, ii) => (
              <button
                key={`${si}-${ii}`}
                className="node-action-menu__item"
                style={item.dividerBefore ? { borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 6 } : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.submenu) {
                    setSubTop(e.currentTarget.offsetTop);
                    setOpenSub((s) => (s === item.submenu ? null : item.submenu!));
                    setImportOpen(false);
                  } else {
                    item.action();
                  }
                }}
              >
                <span className="node-action-menu__icon"><item.icon size={16} /></span>
                <span className="node-action-menu__label">{item.label}</span>
                {item.badge && <Badge tone={item.badgeTone}>{item.badge}</Badge>}
                {item.submenu && <span className="node-action-menu__arrow">›</span>}
              </button>
            ))}
          </div>
        ))}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </div>

      {/* 子面板（flyout） */}
      {openSub === "script" && (
        <div
          className="node-action-submenu"
          style={{ left: menuPos.x + (menuRef.current?.offsetWidth ?? 224) + 8, top: menuPos.y + subTop }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="node-action-submenu__head">
            脚本
            <button className="node-action-submenu__x" onClick={closeSub}>×</button>
          </div>
          <button className="node-action-submenu__item" onClick={() => { addAtNode("script"); closeSub(); }}>新建剧本</button>
          <button className="node-action-submenu__item" onClick={() => setImportOpen((v) => !v)}>导入文本为脚本</button>
          {importOpen && (
            <div className="node-action-submenu__import">
              <textarea
                className="textarea"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="粘贴文本，将作为剧本内容生成节点"
              />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button
                  className="btn btn--sm btn--primary"
                  style={{ flex: 1 }}
                  disabled={!importText.trim()}
                  onClick={() => {
                    if (!importText.trim() || !node) return;
                    const id = addAtNode("script");
                    if (id) useStudio.getState().updateNodePayload(id, { note: importText, prompt: importText });
                    setImportText(""); setImportOpen(false); setOpenSub(null);
                  }}
                >
                  确认导入
                </button>
                <button className="btn btn--sm" onClick={() => { setImportOpen(false); setImportText(""); }}>取消</button>
              </div>
            </div>
          )}
        </div>
      )}

      {openSub === "asset" && (
        <div
          className="node-action-submenu"
          style={{ left: menuPos.x + (menuRef.current?.offsetWidth ?? 224) + 8, top: menuPos.y + subTop }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="node-action-submenu__head">
            素材库 / 生成历史
            <button className="node-action-submenu__x" onClick={closeSub}>×</button>
          </div>
          {!node && <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-faint)" }}>请先选中一个节点</div>}
          {node && assets.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-faint)" }}>暂无素材，可先用「上传图片」添加</div>}
          {node && assets.map((a) => (
            <button
              key={a.id}
              className="node-action-submenu__item"
              onClick={() => {
                if (!node) return;
                useStudio.getState().insertAssetNode(a.id, { x: node.position.x + 260, y: node.position.y + 20 });
                closeSub();
              }}
            >
              <span className="node-action-submenu__thumb">{a.preview ? <img src={a.preview} alt="" /> : <IconImage size={14} />}</span>
              <span className="truncate">{a.name}</span>
            </button>
          ))}
        </div>
      )}

      {openSub === "history" && (
        <div
          className="node-action-submenu"
          style={{ left: menuPos.x + (menuRef.current?.offsetWidth ?? 224) + 8, top: menuPos.y + subTop }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="node-action-submenu__head">
            生成历史
            <button className="node-action-submenu__x" onClick={closeSub}>×</button>
          </div>
          {genHistory.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-faint)" }}>暂无生成记录，先对节点执行「出图 / 出视频」</div>}
          {[...genHistory].reverse().map((h) => (
            <button
              key={h.id}
              className="node-action-submenu__item"
              onClick={() => {
                const pos = node
                  ? { x: node.position.x + 260, y: node.position.y + 20 }
                  : (screenPos ? rf.screenToFlowPosition({ x: screenPos.x, y: screenPos.y }) : { x: 120, y: 120 });
                const newId = addNode("asset", pos);
                if (newId) {
                  useStudio.getState().updateNodePayload(newId, {
                    results: [{ id: String(Date.now()), kind: h.kind, status: "success", url: h.url, model: h.model, createdAt: h.createdAt }],
                    note: `${h.nodeLabel} · 生成历史`,
                  });
                  if (node) useStudio.getState().connectRel(node.id, newId, "reference");
                }
                closeSub();
              }}
            >
              <span className="node-action-submenu__thumb">{h.url ? <img src={h.url} alt="" /> : <IconImage size={14} />}</span>
              <span className="truncate">{h.nodeLabel} · {h.kind === "image" ? "图" : "视频"}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
