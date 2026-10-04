import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useStudioMotion } from "./game/GameMotion";
export function Button({
  children,
  onClick,
  disabled,
  secondary = false,
  className = "",
  type = "button",
  detail,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  secondary?: boolean;
  className?: string;
  type?: "button" | "submit";
  detail?: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button ${secondary ? "secondary" : ""} ${detail ? "button-stacked" : ""} ${className}`}
    >
      {detail ? (
        <span className="button-copy">
          <span>{children}</span>
          <small>{detail}</small>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
export function PanelTitle({
  title,
  eyebrow,
  action,
  onAction,
}: {
  title: string;
  eyebrow?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
export function Empty({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const animated = useStudioMotion();
  const previous = useRef<Element | null>(null);
  useEffect(() => {
    previous.current = document.activeElement;
    const el = ref.current;
    el?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose();
      if (e.key === "Tab") {
        const items = el?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, [tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (previous.current instanceof HTMLElement) previous.current.focus();
    };
  }, [onClose]);
  return (
    <motion.div
      className="modal-backdrop"
      initial={animated ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: animated ? 0.22 : 0 }}
    >
      <motion.div
        ref={ref}
        initial={
          animated ? { opacity: 0, y: 34, scale: 0.94, rotateX: 5 } : false
        }
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        transition={
          animated
            ? { type: "spring", stiffness: 320, damping: 28 }
            : { duration: 0 }
        }
        className={`modal ${wide ? "wide" : ""} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          {onClose && (
            <button
              className="icon-button"
              aria-label="Schließen"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
