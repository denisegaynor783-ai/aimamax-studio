// ============================================================
// AIMAMAX Studio — 全屏工作台 hook（画布 / 3D 导演台 共用）
// 双轨：优先 OS 级全屏（覆盖整块显示器、隐藏外壳）；被拦截则 CSS 铺满视口兜底
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * @param onEnter 进入全屏（含 OS 与 CSS 兜底两种路径）后回调，常用于重新适配视图
 */
export function useFullscreen(onEnter?: () => void) {
  const [isFs, setIsFs] = useState(false);
  const enterRef = useRef(onEnter);
  enterRef.current = onEnter;

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggle = useCallback(() => {
    const layout = document.getElementById("studio-layout");
    // 已处于 CSS 模拟全屏 → 退出
    if (layout?.classList.contains("fs-fake")) {
      layout.classList.remove("fs-fake");
      setIsFs(false);
      return;
    }
    // 浏览器已 OS 全屏 → 退出
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    // 尝试 OS 级全屏：把整个 .app 根全屏（覆盖整块显示器、隐藏侧栏顶栏）
    const root = (document.querySelector(".app") as HTMLElement | null) ?? layout;
    const req = root?.requestFullscreen?.();
    if (req && typeof (req as Promise<void>).then === "function") {
      (req as Promise<void>)
        .then(() => {
          setIsFs(true);
          enterRef.current?.();
        })
        .catch(() => {
          // 被拦截（iframe / 权限策略）→ CSS 模拟铺满视口兜底
          layout?.classList.add("fs-fake");
          setIsFs(true);
          enterRef.current?.();
        });
    } else {
      layout?.classList.add("fs-fake");
      setIsFs(true);
      enterRef.current?.();
    }
  }, []);

  return { isFs, toggle };
}
