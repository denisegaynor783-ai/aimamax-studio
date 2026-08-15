// ============================================================
// AIMAMAX Studio — 统一节点面板（工具条「节点」与右击「添加节点」共用）
// 保证两处暴露的节点类型与快捷生成完全一致，消除「添加节点」与右击菜单的不一致。
// ============================================================
import type { ReactNode } from "react";
import type { NodeKind } from "../lib/types";
import {
  IconText, IconScene, IconImage, IconMusic, IconSpark, IconCharacter, IconVideo,
} from "../components/icons";

export interface PaletteItem {
  kind: NodeKind;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
}

/** 可添加的节点类型（与 store.addNode 支持的 kind 对齐） */
export const NODE_PALETTE: PaletteItem[] = [
  { kind: "text", label: "文本 / 脚本", icon: IconText },
  { kind: "script", label: "剧本卡片", icon: IconText },
  { kind: "character", label: "角色卡", icon: IconCharacter },
  { kind: "scene", label: "场景卡", icon: IconScene },
  { kind: "shot", label: "分镜格", icon: IconImage },
  { kind: "asset", label: "素材", icon: IconImage },
  { kind: "music", label: "音乐轨", icon: IconMusic },
  { kind: "generator", label: "生成器", icon: IconSpark },
];

export interface QuickGenItem {
  gen: "image" | "video";
  label: string;
  icon: (p: { size?: number }) => ReactNode;
}

/** 快捷生成：新建分镜格并立即出图 / 出视频 */
export const QUICK_GEN: QuickGenItem[] = [
  { gen: "image", label: "出图（分镜）", icon: IconImage },
  { gen: "video", label: "出视频（分镜）", icon: IconVideo },
];
