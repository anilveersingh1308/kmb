"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

export interface MenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect?: () => void;
  href?: string;
  /** Shown under the label (e.g. why an item is disabled). */
  hint?: string;
  disabled?: boolean;
  danger?: boolean;
  /** Draw a divider above this item. */
  separated?: boolean;
}

/**
 * "More actions" menu. Portalled to <body> and positioned with `fixed` from the trigger's rect, so it is never clipped by
 * the table's scroll container or painted under the sticky actions column; flips upward near the bottom of the screen. Arrow keys / Home / End / Esc supported.
 */
export default function ActionMenu({ items, label = "More actions" }: { items: MenuItem[]; label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const width = 232, estH = items.length * 46 + 16;
    const up = r.bottom + estH > innerHeight - 8 && r.top > estH;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: Math.max(8, Math.min(r.right - width, innerWidth - width - 8)), up });
  };

  // Measure once on open; scrolling or resizing closes the menu instead of chasing the trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (open) place(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const onScroll = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    addEventListener("scroll", onScroll, true);
    addEventListener("resize", onScroll);
    requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>("[role=menuitem]:not([aria-disabled=true])")?.focus());
    return () => { document.removeEventListener("pointerdown", close); removeEventListener("scroll", onScroll, true); removeEventListener("resize", onScroll); };
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    const els = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])") ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); els[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); els[els.length - 1]?.focus(); }
    else if (e.key === "Escape" || e.key === "Tab") { setOpen(false); if (e.key === "Escape") btn.current?.focus(); }
  };

  const select = (it: MenuItem) => { if (it.disabled) return; setOpen(false); btn.current?.focus(); it.onSelect?.(); };

  return (
    <>
      <button ref={btn} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={label} title={label}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${open ? "border-navy-2 bg-[#eef3fb] text-navy" : "border-line bg-white text-slate-700 hover:border-[#b9c4d4] hover:text-navy"}`}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && pos && createPortal(
        <div ref={menu} id={id} role="menu" aria-label={label} onKeyDown={onKey}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 232, transform: pos.up ? "translateY(-100%)" : undefined }}
          className="z-[80] rounded-lg border border-line bg-white p-1.5 text-left shadow-[0_16px_40px_-8px_rgba(16,24,40,.28)]">
          {items.map((it) => {
            const I = it.icon;
            const cls = `flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none transition focus:bg-[#eef3fb] ${it.disabled ? "cursor-not-allowed opacity-50" : it.danger ? "text-rose-700 hover:bg-rose-50 focus:bg-rose-50" : "text-ink hover:bg-[#eef3fb]"}`;
            const inner = (
              <>
                {I && <I className="mt-0.5 h-4 w-4 shrink-0" />}
                <span className="min-w-0">
                  <span className="block font-medium">{it.label}</span>
                  {it.hint && <span className="block text-xs text-slate-500">{it.hint}</span>}
                </span>
              </>
            );
            return (
              <div key={it.label}>
                {it.separated && <div role="separator" className="my-1.5 h-px bg-line" />}
                {it.href && !it.disabled ? (
                  <a role="menuitem" tabIndex={-1} href={it.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={() => setOpen(false)}>{inner}</a>
                ) : (
                  <button role="menuitem" type="button" tabIndex={-1} aria-disabled={it.disabled || undefined} onClick={() => select(it)} className={cls}>{inner}</button>
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
