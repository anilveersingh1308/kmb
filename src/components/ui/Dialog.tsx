"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "default" | "danger";
  size?: "md" | "lg";
  /** Element to focus when opened (defaults to the first focusable control). */
  initialFocus?: React.RefObject<HTMLElement | null>;
}

/** Modal dialog: focus moves in and is trapped, Esc / backdrop closes, focus returns to the opener, page scroll is locked. */
export default function Dialog({ open, onClose, title, description, children, footer, tone = "default", size = "md", initialFocus }: Props) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => [...(panel.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? [])].filter((el) => !el.hasAttribute("disabled"));
    requestAnimationFrame(() => (initialFocus?.current ?? focusables()[0])?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; opener?.focus?.(); };
  }, [open, onClose, initialFocus]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(11,31,64,.45)] p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={description ? `${id}-d` : undefined}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl border border-line bg-white shadow-[0_24px_64px_-12px_rgba(16,24,40,.35)] sm:rounded-xl ${size === "lg" ? "max-w-2xl" : "max-w-md"}`}>
        <div className={`flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 ${tone === "danger" ? "border-rose-100 bg-rose-50" : "border-line"}`}>
          <div>
            <h2 id={`${id}-t`} className={`text-base font-bold ${tone === "danger" ? "text-rose-800" : "text-ink"}`}>{title}</h2>
            {description && <div id={`${id}-d`} className="mt-1 text-sm text-slate-600">{description}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>}
        {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-[#f7f9fc] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
