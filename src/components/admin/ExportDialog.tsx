"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, Check, Download, EyeOff, FileSpreadsheet, Filter, Layers, Loader2, TriangleAlert } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { EXPORT_COLUMNS, EXPORT_GROUPS, EXPORT_PRESETS } from "@/lib/export-columns";

type Scope = "filtered" | "all" | "range";
interface Filters { q: string; source: string; from: string; to: string }

const PREF_KEY = "cmb_export_prefs";
const ALL = EXPORT_COLUMNS.map((c) => c.key);
const fmtDate = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** "Export CSV" button + dialog: choose which records, which columns, and whether to hide contact details. */
export default function ExportButton({ filters }: { filters: Filters }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold">
        <Download className="h-4 w-4" /> Export CSV
      </button>
      {open && <ExportDialog filters={filters} onClose={() => setOpen(false)} />}
    </>
  );
}

function ExportDialog({ filters, onClose }: { filters: Filters; onClose: () => void }) {
  const hasFilters = !!(filters.q || filters.source || filters.from || filters.to);
  const [scope, setScope] = useState<Scope>(hasFilters ? "filtered" : "all");
  const [range, setRange] = useState({ from: filters.from, to: filters.to });
  const [cols, setCols] = useState<string[]>(ALL);
  const [mask, setMask] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<Scope, number | null>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const downloadRef = useRef<HTMLButtonElement>(null);

  // Remember the last column choice + privacy setting on this device.
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? "null");
      if (p && Array.isArray(p.cols)) setCols(p.cols.filter((k: string) => ALL.includes(k)));
      if (p && typeof p.mask === "boolean") setMask(p.mask);
    } catch { /* storage unavailable */ }
  }, []);

  const params = (s: Scope, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ scope: s, ...extra });
    if (s === "filtered") for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
    if (s === "range") { if (range.from) p.set("from", range.from); if (range.to) p.set("to", range.to); }
    return p;
  };

  // Live record counts for each choice (range re-counts as the dates change).
  useEffect(() => {
    let alive = true;
    const scopes: Scope[] = hasFilters ? ["filtered", "all", "range"] : ["all", "range"];
    for (const s of scopes) {
      if (s === "range" && !range.from) { setCounts((c) => ({ ...c, range: null })); continue; }
      fetch(`/api/admin/export?${params(s, { preview: "1" })}`).then((r) => r.json()).then((d) => { if (alive) setCounts((c) => ({ ...c, [s]: typeof d.count === "number" ? d.count : null })); }).catch(() => {});
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const selected = useMemo(() => EXPORT_COLUMNS.filter((c) => cols.includes(c.key)), [cols]);
  const hasPersonal = selected.some((c) => c.personal);
  const preset = EXPORT_PRESETS.find((p) => p.cols.length === cols.length && p.cols.every((k) => cols.includes(k)))?.key;
  const count = counts[scope];
  const rangeLabel = range.from ? (range.to && range.to !== range.from ? `${fmtDate(range.from)} – ${fmtDate(range.to)}` : fmtDate(range.from)) : "";
  const fileName = `carry-me-back_${scope === "all" ? "all-records" : scope === "range" ? `${range.from || "range"}${range.to && range.to !== range.from ? `_to_${range.to}` : ""}` : "filtered"}${mask && hasPersonal ? "_masked" : ""}_${today()}.csv`;
  const canDownload = selected.length > 0 && !(scope === "range" && !range.from) && count !== 0 && !busy;

  const filterChips = [
    filters.q && `“${filters.q}”`,
    filters.source && (filters.source === "web" ? "Web" : "Mobile app"),
    filters.from && (filters.to && filters.to !== filters.from ? `${fmtDate(filters.from)} – ${fmtDate(filters.to)}` : fmtDate(filters.from)),
  ].filter(Boolean) as string[];

  const toggle = (k: string) => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : ALL.filter((x) => x === k || c.includes(x))));
  const toggleGroup = (keys: string[], on: boolean) => setCols((c) => ALL.filter((x) => (keys.includes(x) ? on : c.includes(x))));

  const download = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/export?${params(scope, { cols: selected.map((c) => c.key).join(","), mask: mask && hasPersonal ? "1" : "0", filename: fileName })}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Export failed (${res.status})`);
      const blob = await res.blob();
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: fileName });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      try { localStorage.setItem(PREF_KEY, JSON.stringify({ cols, mask })); } catch { /* storage unavailable */ }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const scopes: { key: Scope; icon: typeof Filter; title: string; sub: React.ReactNode }[] = [
    ...(hasFilters ? [{ key: "filtered" as Scope, icon: Filter, title: "Current filtered view", sub: filterChips.join(" · ") }] : []),
    { key: "all", icon: Layers, title: "All records", sub: "Every certificate ever issued" },
    { key: "range", icon: CalendarRange, title: "A date range", sub: rangeLabel || "Pick deposit dates" },
  ];

  return (
    <Dialog open onClose={onClose} size="lg" title="Export records" initialFocus={downloadRef}
      description="Download a CSV file that opens in Excel or Google Sheets (Hindi names display correctly)."
      footer={<>
        <p className="mr-auto flex min-w-0 items-center gap-1.5 text-xs text-slate-500"><FileSpreadsheet className="h-4 w-4 shrink-0 text-indiagreen" /> <span className="truncate font-mono">{fileName}</span></p>
        <button type="button" onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">Cancel</button>
        <button ref={downloadRef} type="button" onClick={download} disabled={!canDownload} className="btn-gold inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {busy ? "Preparing…" : `Download${typeof count === "number" ? ` ${count.toLocaleString("en-IN")} record${count === 1 ? "" : "s"}` : ""}`}
        </button>
      </>}>
      <div className="space-y-6">
        {/* 1. Which records */}
        <fieldset>
          <legend className="text-sm font-bold text-ink">1. Which records?</legend>
          <div className={`mt-2 grid gap-2 ${scopes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} role="radiogroup">
            {scopes.map(({ key, icon: I, title, sub }) => {
              const on = scope === key;
              const n = counts[key];
              return (
                <label key={key} className={`relative flex cursor-pointer flex-col rounded-lg border p-3 transition ${on ? "border-navy bg-[#eef3fb] ring-1 ring-navy" : "border-line bg-white hover:border-[#b9c4d4]"}`}>
                  <input type="radio" name="export-scope" value={key} checked={on} onChange={() => setScope(key)} className="sr-only" />
                  <span className="flex items-center gap-2 pr-5 text-sm font-semibold text-ink"><I className={`h-4 w-4 shrink-0 ${on ? "text-navy" : "text-slate-500"}`} /> {title}</span>
                  <span className="mt-1 line-clamp-2 text-xs text-slate-600">{sub}</span>
                  <span className="mt-2 text-xs font-bold text-navy">
                    {key === "range" && !range.from ? "—" : n === undefined ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : n === null ? "—" : `${n.toLocaleString("en-IN")} record${n === 1 ? "" : "s"}`}
                  </span>
                  {on && <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-navy" />}
                </label>
              );
            })}
          </div>
          {scope === "range" && (
            <div className="mt-3">
              <DateRangePicker inline fromName="export_from" toName="export_to" defaultFrom={range.from} defaultTo={range.to}
                onChange={(r) => setRange((cur) => (cur.from === r.from && cur.to === (r.to || r.from) ? cur : { from: r.from, to: r.to || r.from }))} />
            </div>
          )}
          {count === 0 && <p className="mt-2 text-xs font-medium text-amber-700">No records match this choice.</p>}
        </fieldset>

        {/* 2. Columns */}
        <fieldset>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <legend className="text-sm font-bold text-ink">2. Which columns?</legend>
            <span className="text-xs text-slate-600"><b className="text-navy">{selected.length}</b> of {ALL.length} selected</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXPORT_PRESETS.map((p) => (
              <button key={p.key} type="button" onClick={() => setCols(p.cols)} aria-pressed={preset === p.key} title={p.hint}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${preset === p.key ? "border-navy bg-navy text-white" : "border-[#b9c4d4] bg-white text-navy hover:bg-[#eef3fb]"}`}>
                {p.label}
              </button>
            ))}
            <button type="button" onClick={() => setCols([])} className="rounded-full px-2 py-1 text-xs font-semibold text-slate-600 hover:text-navy">Clear</button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {EXPORT_GROUPS.map((g) => {
              const groupCols = EXPORT_COLUMNS.filter((c) => c.group === g);
              const keys = groupCols.map((c) => c.key);
              const n = keys.filter((k) => cols.includes(k)).length;
              return (
                <div key={g} className="rounded-lg border border-line p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <input type="checkbox" checked={n === keys.length} ref={(el) => { if (el) el.indeterminate = n > 0 && n < keys.length; }}
                      onChange={(e) => toggleGroup(keys, e.target.checked)} className="h-4 w-4 accent-[#0b2f6b]" />
                    {g}
                  </label>
                  <div className="mt-2 grid gap-1.5 pl-6">
                    {groupCols.map((c) => (
                      <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input type="checkbox" checked={cols.includes(c.key)} onChange={() => toggle(c.key)} className="h-4 w-4 accent-[#0b2f6b]" />
                        {c.label}
                        {c.personal && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold uppercase text-amber-800">personal</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {selected.length === 0 && <p className="mt-2 text-xs font-medium text-rose-700">Choose at least one column.</p>}
        </fieldset>

        {/* 3. Privacy */}
        <fieldset>
          <legend className="text-sm font-bold text-ink">3. Privacy</legend>
          <label className={`mt-2 flex items-start justify-between gap-4 rounded-lg border border-line p-3 ${hasPersonal ? "cursor-pointer" : "opacity-60"}`}>
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-ink"><EyeOff className="h-4 w-4 text-slate-500" /> Hide phone numbers &amp; emails</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                {hasPersonal ? <>Shows e.g. <span className="font-mono">98••••••10</span> and <span className="font-mono">ra•••@gmail.com</span> — use when sharing the file outside the office.</> : "No personal columns selected."}
              </span>
            </span>
            <input type="checkbox" role="switch" checked={mask && hasPersonal} disabled={!hasPersonal} onChange={(e) => setMask(e.target.checked)} className="peer sr-only" />
            <span aria-hidden className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${mask && hasPersonal ? "bg-navy" : "bg-slate-300"} peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-saffron`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${mask && hasPersonal ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </label>
        </fieldset>

        {error && <p role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}
      </div>
    </Dialog>
  );
}
