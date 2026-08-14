// ============================================================
// AIMAMAX Studio — 复用组件原语
// ============================================================
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { IconClose } from "./icons";

type BtnVariant = "primary" | "ghost" | "danger" | "default";
type BtnSize = "sm" | "md";

export function Button({
  variant = "default",
  size = "md",
  icon,
  block,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
  block?: boolean;
}) {
  const cls = [
    "btn",
    variant !== "default" ? `btn--${variant}` : "",
    size === "sm" ? "btn--sm" : "",
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={`btn btn--icon ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  style,
}: {
  title?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section className="panel" style={style}>
      {(title || actions) && (
        <header className="panel__head">
          <div style={{ flex: 1 }}>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <div className="panel__title">{title}</div>}
          </div>
          {actions}
        </header>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <span className="toggle" data-on={checked} role="switch" aria-checked={checked} onClick={() => onChange(!checked)} />
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
    </label>
  );
}

export function Badge({
  children,
  tone = "ghost",
}: {
  children: ReactNode;
  tone?: "ghost" | "film" | "signal" | "ok";
}) {
  const cls = tone === "ghost" ? "badge--ghost" : `badge--${tone}`;
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div style={{ fontWeight: 700, color: "var(--text-dim)" }}>{title}</div>
      {hint && <div style={{ maxWidth: 360, fontSize: 13 }}>{hint}</div>}
      {action}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal__overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div style={{ fontWeight: 700 }}>{title}</div>
          <IconButton onClick={onClose} aria-label="关闭">
            <IconClose size={18} />
          </IconButton>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.4" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
