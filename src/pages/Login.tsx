// ============================================================
// AIMAMAX Studio — 登录页（影院控制台风格，与主页面同源设计）
// 脱离 Rail/TopBar 外壳，全屏沉浸式；提交后进入工作台（/）。
// ============================================================
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui";
import { IconFilm, IconSpark, IconImage, IconMusic, IconChevron } from "../components/icons";
import { setToken, defaultApiBase } from "../lib/auth";

const FEATURES: { icon: (p: { size?: number }) => JSX.Element; t: string; d: string }[] = [
  { icon: IconSpark, t: "AI 编剧 / 分镜", d: "就地出图、出片、出剧本" },
  { icon: IconImage, t: "无限画布", d: "角色·场景·分镜自由编排" },
  { icon: IconMusic, t: "多模态生成", d: "OpenAI / ToAPIs / 火山方舟" },
];

export default function Login() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");

  // 微信 OAuth 回调：携带 ?token= 落地时，保存 JWT 并进入工作台
  useEffect(() => {
    const t = params.get("token");
    if (t) {
      setToken(t);
      params.delete("token");
      setParams(params, { replace: true });
      nav("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 微信登录：整页跳转后端 OAuth 入口（未配置时后端自动走 Demo 游客）
  const wechatLogin = () => {
    const base = defaultApiBase();
    const redirect = encodeURIComponent(window.location.origin + "/login");
    window.location.href = `${base}/api/auth/wechat/login?redirect=${redirect}`;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pwd.trim()) {
      setErr("请输入工作区邮箱与密码");
      return;
    }
    try {
      localStorage.setItem("amx_auth", remember ? "1" : "0");
    } catch {
      /* localStorage 不可用时忽略 */
    }
    nav("/");
  };

  const enterDemo = () => nav("/");

  return (
    <div className="login-epic">
      <div className="login-epic__bg" />
      <div className="login-epic__grid" />
      <button className="login-epic__back" onClick={() => nav("/")}>
        <IconChevron size={15} style={{ transform: "rotate(180deg)" }} /> 返回首页
      </button>

      <div className="login-epic__split">
        {/* —— 品牌侧 —— */}
        <aside className="login-epic__brand">
          <div className="login-epic__logo">
            <IconFilm size={26} />
          </div>
          <div className="login-epic__eyebrow">AI FILM · COMIC DIRECTOR WORKBENCH</div>
          <h1 className="login-epic__tagline">
            把灵感
            <br />
            拖成一部片。
          </h1>
          <p className="login-epic__lede">
            AIMAMAX Studio 是影院控制台风格的 AI 影视 / 漫剧导演工作台。登录后进入你的无限画布与 3D 导演台。
          </p>
          <ul className="login-epic__feats">
            {FEATURES.map((f) => {
              const I = f.icon;
              return (
                <li key={f.t}>
                  <span className="login-epic__feat-ic">
                    <I size={18} />
                  </span>
                  <div>
                    <b>{f.t}</b>
                    <span>{f.d}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="login-epic__brand-foot">© 2026 AIMAMAX · ninedeerselect.com</div>
        </aside>

        {/* —— 表单侧 —— */}
        <main className="login-epic__panel">
          <div className="login-epic__card">
            <div className="eyebrow">SIGN IN</div>
            <h2>登录导演工作台</h2>
            <p className="login-epic__sub">进入你的无限画布 · 3D 导演台 · 资产库</p>

            <form onSubmit={submit}>
              <label className="field">
                <span className="field__label">工作区邮箱</span>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  placeholder="you@studio.com"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErr("");
                  }}
                />
              </label>

              <label className="field">
                <span className="field__label">密码</span>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={pwd}
                  placeholder="••••••••"
                  onChange={(e) => {
                    setPwd(e.target.value);
                    setErr("");
                  }}
                />
              </label>

              <div className="login-epic__row">
                <label className="login-epic__remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  记住我
                </label>
                <a className="login-epic__link" onClick={enterDemo}>
                  忘记密码？
                </a>
              </div>

              {err && <div className="login-epic__err">{err}</div>}

              <Button variant="primary" block type="submit">
                进入导演台
              </Button>
            </form>

            <div className="login-epic__divider">
              <span>或</span>
            </div>

            <Button variant="primary" block onClick={wechatLogin} style={{ background: "#07c160", borderColor: "#07c160" }}>
              微信登录
            </Button>

            <Button variant="ghost" block onClick={enterDemo}>
              DEMO 模式体验（免登录）
            </Button>

            <div className="login-epic__foot">
              还没有工作区？<a className="login-epic__link" onClick={enterDemo}>创建 / 直接体验 →</a>
            </div>
          </div>
          <div className="login-epic__copy">影院控制台 v1.0 · 数据存于本地 · 离线可用</div>
        </main>
      </div>
    </div>
  );
}
