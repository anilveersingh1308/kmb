"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

/* ---------- local-date helpers (YYYY-MM-DD, no timezone drift) ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const todayISO = () => toISO(new Date());
const fmt = (s: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) => fromISO(s).toLocaleDateString("en-IN", opts);
const daysBetween = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000) + 1;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("en-IN", { month: "short" }));

type Range = { from: string; to: string };

function presets(): { label: string; range: Range }[] {
  const t = new Date();
  const T = toISO(t);
  return [
    { label: "Today", range: { from: T, to: T } },
    { label: "Yesterday", range: { from: toISO(addDays(t, -1)), to: toISO(addDays(t, -1)) } },
    { label: "Last 7 days", range: { from: toISO(addDays(t, -6)), to: T } },
    { label: "Last 30 days", range: { from: toISO(addDays(t, -29)), to: T } },
    { label: "This month", range: { from: toISO(startOfMonth(t)), to: T } },
    { label: "Last month", range: { from: toISO(addMonths(t, -1)), to: toISO(addDays(startOfMonth(t), -1)) } },
    { label: "All time", range: { from: "", to: "" } },
  ];
}

interface Props {
  fromName: string;
  toName: string;
  defaultFrom?: string;
  defaultTo?: string;
  className?: string;
  /** Open the calendar in the document flow (e.g. inside a scrolling dialog) instead of as a floating popover. */
  inline?: boolean;
  onChange?: (range: { from: string; to: string }) => void;
}

/**
 * Date-range picker for filters: preset shortcuts, range calendar with hover preview,
 * month/year jump view, full keyboard support. Submits two hidden YYYY-MM-DD inputs.
 * Future dates are disabled — deposits can't be in the future.
 */
export default function DateRangePicker({ fromName, toName, defaultFrom = "", defaultTo = "", className = "", inline = false, onChange }: Props) {
  const [range, setRange] = useState<Range>({ from: defaultFrom, to: defaultTo });
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [month, setMonth] = useState(() => startOfMonth(fromISO(defaultTo || defaultFrom || todayISO())));
  const [hover, setHover] = useState("");
  const [focus, setFocus] = useState(defaultFrom || todayISO());
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const max = todayISO();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => { onChangeRef.current?.(range); }, [range]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    // Capture phase + stopPropagation: Esc closes only the calendar, not a dialog the picker sits in.
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey, true); };
  }, [open]);

  // Roving focus: keep the keyboard-focused day visible and focused.
  useEffect(() => {
    if (open && view === "days") gridRef.current?.querySelector<HTMLElement>(`[data-date="${focus}"]`)?.focus({ preventScroll: true });
  }, [open, view, focus, month]);

  const openPicker = () => {
    const anchor = range.to || range.from || max;
    setMonth(startOfMonth(fromISO(anchor)));
    setFocus(anchor);
    setView("days");
    setOpen(true);
  };

  const pick = (iso: string) => {
    if (iso > max) return;
    if (!range.from || range.to) setRange({ from: iso, to: "" });
    else if (iso < range.from) setRange({ from: iso, to: range.from });
    else setRange({ from: range.from, to: iso });
    setFocus(iso);
  };

  const moveFocus = (days: number) => {
    const next = addDays(fromISO(focus), days);
    const iso = toISO(next) > max ? max : toISO(next);
    setFocus(iso);
    if (startOfMonth(fromISO(iso)).getTime() !== month.getTime()) setMonth(startOfMonth(fromISO(iso)));
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in map) { e.preventDefault(); moveFocus(map[e.key]); }
    else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const d = fromISO(focus);
      const target = new Date(d.getFullYear(), d.getMonth() + (e.key === "PageUp" ? -1 : 1), d.getDate());
      const iso = toISO(target) > max ? max : toISO(target);
      setFocus(iso); setMonth(startOfMonth(fromISO(iso)));
    }
    else if (e.key === "Home") { e.preventDefault(); moveFocus(-fromISO(focus).getDay()); }
    else if (e.key === "End") { e.preventDefault(); moveFocus(6 - fromISO(focus).getDay()); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(focus); }
  };

  const applyPreset = (r: Range) => {
    setRange(r);
    if (r.to) setMonth(startOfMonth(fromISO(r.to)));
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Effective range for highlighting (includes hover preview while choosing the end date)
  const previewEnd = range.from && !range.to && hover ? hover : range.to;
  const lo = previewEnd && previewEnd < range.from ? previewEnd : range.from;
  const hi = previewEnd && previewEnd < range.from ? range.from : previewEnd;

  const first = startOfMonth(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - first.getDay()));
  const nextDisabled = toISO(addMonths(month, 1)) > max;

  const label = range.from
    ? range.to && range.to !== range.from ? `${fmt(range.from)} – ${fmt(range.to)}` : fmt(range.from)
    : "Any date";
  const activePreset = presets().find((p) => p.range.from === range.from && p.range.to === range.to)?.label;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <input type="hidden" name={fromName} value={range.from} />
      {/* A single day selected means "that day" */}
      <input type="hidden" name={toName} value={range.to || range.from} />

      <div className="relative">
        <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? setOpen(false) : openPicker())}
          className={`input flex items-center gap-2 pr-9 text-left ${open ? "border-navy-2 ring-3 ring-navy-2/15" : ""}`}>
          <CalendarDays className="h-4 w-4 shrink-0 text-navy" />
          <span className={`min-w-0 truncate ${range.from ? "text-ink" : "text-slate-500"}`}>{activePreset && activePreset !== "All time" ? `${activePreset} · ` : ""}{label}</span>
        </button>
        {range.from && (
          <button type="button" aria-label="Clear dates" onClick={() => setRange({ from: "", to: "" })}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-ink">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label="Choose date range"
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.14 }}
            className={`${inline ? "relative" : "absolute inset-x-0 z-50 sm:left-auto sm:w-[34rem] sm:origin-top-right"} mt-2 origin-top overflow-hidden rounded-lg border border-line bg-white shadow-[0_24px_48px_-12px_rgba(16,24,40,.28)]`}>
            <div className="flex flex-col sm:flex-row">
              {/* Presets */}
              <ul className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] border-b border-line bg-[#f7f9fc] p-2 sm:w-40 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-r">
                {presets().map((p) => (
                  <li key={p.label} className="shrink-0">
                    <button type="button" onClick={() => applyPreset(p.range)}
                      className={`w-full whitespace-nowrap rounded px-3 py-1.5 text-left text-sm transition ${activePreset === p.label ? "bg-navy font-semibold text-white" : "text-slate-700 hover:bg-[#eef3fb] hover:text-navy"}`}>
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>

              {/* Calendar */}
              <div className="flex-1 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <button type="button" aria-label={view === "days" ? "Previous month" : "Previous year"}
                    onClick={() => setMonth((m) => (view === "days" ? addMonths(m, -1) : new Date(m.getFullYear() - 1, m.getMonth(), 1)))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#eef3fb] hover:text-navy">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setView((v) => (v === "days" ? "months" : "days"))} aria-live="polite"
                    className="rounded px-2 py-1 text-sm font-bold text-navy hover:bg-[#eef3fb]" title={view === "days" ? "Jump to another month" : "Back to days"}>
                    {view === "days" ? month.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : month.getFullYear()}
                  </button>
                  <button type="button" aria-label={view === "days" ? "Next month" : "Next year"}
                    disabled={view === "days" ? nextDisabled : month.getFullYear() >= new Date().getFullYear()}
                    onClick={() => setMonth((m) => (view === "days" ? addMonths(m, 1) : new Date(m.getFullYear() + 1, m.getMonth(), 1)))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-[#eef3fb] hover:text-navy disabled:pointer-events-none disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {view === "months" ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {MONTHS.map((m, i) => {
                      const d = new Date(month.getFullYear(), i, 1);
                      const disabled = toISO(d) > max;
                      const current = i === month.getMonth();
                      return (
                        <button key={m} type="button" disabled={disabled} onClick={() => { setMonth(d); setView("days"); }}
                          className={`rounded-md py-2.5 text-sm font-medium transition disabled:opacity-30 ${current ? "bg-navy text-white" : "text-slate-700 hover:bg-[#eef3fb] hover:text-navy"}`}>
                          {m}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
                    </div>
                    <div ref={gridRef} role="grid" aria-label={month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} onKeyDown={onGridKey}
                      onPointerLeave={() => setHover("")} className="grid grid-cols-7 gap-y-1">
                      {cells.map((d) => {
                        const iso = toISO(d);
                        const outside = d.getMonth() !== month.getMonth();
                        const disabled = iso > max;
                        const isStart = iso === lo, isEnd = iso === hi;
                        const inRange = lo && hi && iso > lo && iso < hi;
                        const isToday = iso === max;
                        const edge = isStart || isEnd;
                        return (
                          <div key={iso} role="gridcell" aria-selected={!!(edge || inRange)}
                            className={`relative flex h-9 items-center justify-center
                              ${inRange ? "bg-[#e6eefb]" : ""}
                              ${isStart && hi && hi !== lo ? "bg-[linear-gradient(90deg,transparent_50%,#e6eefb_50%)]" : ""}
                              ${isEnd && lo && hi !== lo ? "bg-[linear-gradient(90deg,#e6eefb_50%,transparent_50%)]" : ""}`}>
                            <button type="button" data-date={iso} tabIndex={iso === focus ? 0 : -1} disabled={disabled}
                              aria-label={d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                              aria-current={isToday ? "date" : undefined}
                              onClick={() => pick(iso)} onPointerEnter={() => setHover(iso)} onFocus={() => setFocus(iso)}
                              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition
                                ${edge ? "bg-navy font-semibold text-white shadow-sm" : inRange ? "text-navy" : outside ? "text-slate-400" : "text-ink"}
                                ${!edge && !disabled ? "hover:bg-[#d6e3f8]" : ""}
                                ${disabled ? "cursor-not-allowed text-slate-300 line-through decoration-slate-300/60" : ""}`}>
                              {d.getDate()}
                              {isToday && !edge && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-saffron" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <p className="text-xs text-slate-600" aria-live="polite">
                    {range.from && range.to ? <><b className="text-navy">{daysBetween(range.from, range.to)}</b> day{daysBetween(range.from, range.to) === 1 ? "" : "s"} selected</>
                      : range.from ? "Now pick an end date" : "Pick a start date"}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setMonth(startOfMonth(new Date())); setFocus(max); setView("days"); }}
                      className="rounded px-2.5 py-1.5 text-xs font-semibold text-navy hover:bg-[#eef3fb]">Today</button>
                    <button type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}
                      className="btn-gold rounded px-3 py-1.5 text-xs font-semibold">Done</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
