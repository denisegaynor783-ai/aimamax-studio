// ============================================================
// AIMAMAX Studio — 线性图标集（影院控制台风格）
// 统一 24x24 / stroke 1.6，currentColor 着色
// ============================================================
import type { CSSProperties } from "react";

interface P {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

function S({ size = 22, className, style, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconDiscover = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </S>
);
export const IconCreate = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </S>
);
export const IconAssets = (p: P) => (
  <S {...p}>
    <path d="M3 7l9-4 9 4-9 4-9-4z" />
    <path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
  </S>
);
export const IconProjects = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 4v16" />
  </S>
);
export const IconSettings = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </S>
);
export const IconPlay = (p: P) => (
  <S {...p}>
    <path d="M7 5l12 7-12 7V5z" fill="currentColor" stroke="none" />
  </S>
);
export const IconImage = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5L5 20" />
  </S>
);
export const IconVideo = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="13" height="14" rx="2" />
    <path d="M16 9l5-3v12l-5-3" />
  </S>
);
export const IconText = (p: P) => (
  <S {...p}>
    <path d="M5 5h14M12 5v14M9 19h6" />
  </S>
);
export const IconCharacter = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </S>
);
export const IconScene = (p: P) => (
  <S {...p}>
    <path d="M3 20l5-9 4 6 3-4 6 7z" />
    <circle cx="17" cy="6" r="2" />
  </S>
);
export const IconMusic = (p: P) => (
  <S {...p}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </S>
);
export const IconPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const IconTrash = (p: P) => (
  <S {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </S>
);
export const IconClose = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);
export const IconSave = (p: P) => (
  <S {...p}>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M8 4v5h7M8 20v-6h8v6" />
  </S>
);
export const IconExport = (p: P) => (
  <S {...p}>
    <path d="M12 15V3M8 7l4-4 4 4" />
    <path d="M5 15v4h14v-4" />
  </S>
);
export const IconImport = (p: P) => (
  <S {...p}>
    <path d="M12 3v12M8 11l4 4 4-4" />
    <path d="M5 15v4h14v-4" />
  </S>
);
export const IconLink = (p: P) => (
  <S {...p}>
    <path d="M9 15l6-6" />
    <path d="M10 6l1-1a4 4 0 016 6l-1 1M14 18l-1 1a4 4 0 01-6-6l1-1" />
  </S>
);
export const IconSpark = (p: P) => (
  <S {...p}>
    <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
  </S>
);
export const IconChevron = (p: P) => (
  <S {...p}>
    <path d="M9 6l6 6-6 6" />
  </S>
);
export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="M5 12l5 5L19 7" />
  </S>
);
export const IconWarn = (p: P) => (
  <S {...p}>
    <path d="M12 3l9 16H3z" />
    <path d="M12 9v5M12 17h.01" />
  </S>
);
export const IconFilm = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
  </S>
);
export const IconCube = (p: P) => (
  <S {...p}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
  </S>
);
export const IconLayout = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 9v12" />
  </S>
);
export const IconDuplicate = (p: P) => (
  <S {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h8" />
  </S>
);
export const IconGrid = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </S>
);
export const IconExpand = (p: P) => (
  <S {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </S>
);
export const IconFullscreenExit = (p: P) => (
  <S {...p}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </S>
);
export const IconLayers = (p: P) => (
  <S {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </S>
);
export const IconLink2 = (p: P) => (
  <S {...p}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.5 6H15a3 3 0 013 3v6.5" />
  </S>
);
