"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

interface Props {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  /** Shown inside the field after the number, e.g. "kg". */
  unit?: string;
  decrementLabel: string;
  incrementLabel: string;
}

const round = (n: number, step: number) => Math.round(n / step) * step;

/**
 * Joined − [ value ] + control. Free typing (drafts like "0." stay intact) is validated and
 * clamped on blur; buttons, ↑/↓ keys and Shift+↑/↓ (×10) step by `step`. Mouse-wheel never changes it.
 */
export default function Stepper({ id, value, onChange, min, max, step, unit, decrementLabel, incrementLabel }: Props) {
  const [draft, setDraft] = useState(String(value));
  const editing = useRef(false);
  // Mirror outside changes (buttons, form reset) — but never rewrite what the user is mid-typing.
  useEffect(() => { if (!editing.current) setDraft(String(value)); }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, Number(round(n, step).toFixed(2))));
  const parse = (raw: string) => (raw.trim() === "" ? NaN : Number(raw.replace(",", ".")));
  const commit = (raw: string) => {
    editing.current = false;
    const n = parse(raw);
    const next = Number.isFinite(n) ? clamp(n) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };
  /** Report valid in-range numbers immediately so Enter-to-submit never sends a stale value. */
  const type = (raw: string) => {
    editing.current = true;
    setDraft(raw);
    const n = parse(raw);
    if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
  };
  const bump = (dir: 1 | -1, mult = 1) => onChange(clamp(value + dir * step * mult));
  const decimal = step % 1 !== 0;

  return (
    <div className="flex h-12 items-stretch overflow-hidden rounded-md border border-[#b9c4d4] bg-white focus-within:border-navy-2 focus-within:ring-3 focus-within:ring-navy-2/15">
      <button type="button" onClick={() => bump(-1)} disabled={value <= min} aria-label={decrementLabel} aria-controls={id}
        className="flex w-11 shrink-0 items-center justify-center border-r border-line text-navy transition hover:bg-[#eef3fb] active:bg-[#e2eaf7] disabled:text-slate-300 disabled:hover:bg-white">
        <Minus className="h-4 w-4" />
      </button>
      <div className="relative flex min-w-0 flex-1 items-center">
        <input id={id} type="text" inputMode={decimal ? "decimal" : "numeric"} role="spinbutton"
          aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
          value={draft}
          onChange={(e) => type(e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); editing.current = false; bump(e.key === "ArrowUp" ? 1 : -1, e.shiftKey ? 10 : 1); }
          }}
          className={`h-full w-full min-w-0 bg-transparent text-center text-base font-semibold tabular-nums text-ink outline-none ${unit ? "pr-7" : ""}`} />
        {unit && <span className="pointer-events-none absolute right-2.5 text-xs font-medium text-slate-500">{unit}</span>}
      </div>
      <button type="button" onClick={() => bump(1)} disabled={value >= max} aria-label={incrementLabel} aria-controls={id}
        className="flex w-11 shrink-0 items-center justify-center border-l border-line text-navy transition hover:bg-[#eef3fb] active:bg-[#e2eaf7] disabled:text-slate-300 disabled:hover:bg-white">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
