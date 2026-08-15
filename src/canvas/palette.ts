// ============================================================
// AIMAMAX Studio — 统一节点面板（工具条「节点」与右击菜单共用）
// 参照目标 UI 截图重构：添加节点(内容基元+动作) / 脚本› / 素材库› / 添加资源
// ============================================================
import type { ReactNode } from "react";
import type { NodeKind } from "../lib/types";
import {
  IconText, IconImage, IconVideo, IconMusic,
  IconScissors, IconDirector, IconFilmStrip,
} from "../components/icons";

export interface PaletteItem {
  kind: NodeKind;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
}

/** ── 添加节点区：内容基元（文本/图片/视频/音频） ── */
export const NODE_PALETTE: PaletteItem[] = [
  { kind: "text", label: "文本", icon: IconText },
  { kind: "shot", label: "图片", icon: IconImage },
  { kind: "shot", label: "视频", icon: IconVideo },
  { kind: "music", label: "音频", icon: IconMusic },
];

/** ── 添加节点区：动作项（智能剪辑/导演台/逐帧拉片） ── */
export interface ActionItem {
  key: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  badge?: string;
  badge2?: string;       // 第二个 badge（如逐帧拉片的 💎 + ⚡ SD 2.5）
  badgeTone?: "signal" | "ok" | "info" | "ghost" | "film";
  badge2Tone?: "signal" | "ok" | "info" | "ghost" | "film";
}

export const ACTION_ITEMS: ActionItem[] = [
  { key: "smartClip", label: "智能剪辑", icon: IconScissors, badge: "Beta", badgeTone: "ghost" },
  { key: "director", label: "导演台", icon: IconDirector, badge: "NEW", badgeTone: "ok" },
  { key: "frameStrip", label: "逐帧拉片", icon: IconFilmStrip, badge: "\u{1F48E}", badgeTone: "film", badge2: "\u26A1 SD 2.5", badge2Tone: "info" },
];

/** 兼容旧接口：快捷生成（出图/出视频）仍保留供内部 quickGen 使用 */
export interface QuickGenItem {
  gen: "image" | "video";
  label: string;
  icon: (p: { size?: number }) => ReactNode;
}

export const QUICK_GEN: QuickGenItem[] = [
  { gen: "image", label: "出图（分镜）", icon: IconImage },
  { gen: "video", label: "出视频（分镜）", icon: IconVideo },
];
