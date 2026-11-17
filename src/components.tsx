import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Compass,
  LoaderCircle,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "./context";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className={`brand ${compact ? "compact" : ""}`}
      aria-label="Tabi, página inicial"
    >
      <span className="brand-mark">
        <Compass size={25} strokeWidth={1.3} />
      </span>
      <span>
        tabi<span className="brand-dot">.</span>
        <small>SEU PRÓXIMO CAPÍTULO</small>
      </span>
    </Link>
  );
}
export function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="theme-button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-body">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">DO SEU JEITO</span>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {description && (
          <p className="muted modal-description">{description}</p>
        )}
        {children}
      </div>
    </dialog>
  );
}
export function FullLoading({
  title = "Preparando sua viagem",
  description = "Seus próximos capítulos estão tomando forma.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="full-loading">
      <div className="loading-orbit">
        <Compass size={35} strokeWidth={1} />
        <span />
        <i />
      </div>
      <span className="eyebrow">JÁ VAMOS PARTIR</span>
      <h1>
        {title}
        <span className="animated-dots">...</span>
      </h1>
      <p>{description}</p>
      <div className="loading-line">
        <span />
      </div>
    </div>
  );
}
export function SubmitButton({
  busy,
  children,
  className = "button primary",
  ...props
}: {
  busy: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={className}
      disabled={busy || props.disabled}
      type="submit"
    >
      {busy ? <LoaderCircle size={17} className="spin" /> : children}
      {busy && "Só um instante"}
    </button>
  );
}
export function SectionHeading({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {kicker && <span className="eyebrow">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function Empty({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function SourceLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="text-link" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
export function FieldError({ message }: { message: string }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
