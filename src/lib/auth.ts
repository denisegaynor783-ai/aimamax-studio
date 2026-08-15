// ============================================================
// AIMAMAX Studio — 鉴权 / API 基址辅助
// 登录后 JWT 存 localStorage；生成请求携带 Bearer。
// API 基址优先级：设置项 > 构建期 VITE_API_BASE > 默认子域。
// ============================================================
const TOKEN_KEY = "aimamax_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** 构建期基址（由 Vite 注入） */
function buildApiBase(): string {
  const v = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE;
  return v?.trim() || "";
}

export function defaultApiBase(): string {
  return "https://api.ninedeerselect.com";
}

/** 解析最终 API 基址 */
export function resolveApiBase(settings: { apiBase?: string }): string {
  return (settings.apiBase?.trim() || buildApiBase() || defaultApiBase()).replace(/\/$/, "");
}
