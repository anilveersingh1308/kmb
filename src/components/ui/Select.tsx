"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface Props {
  options: SelectOption[];
  /** Form field name — the value is submitted through a hidden input. */
  name?: string;
  id?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}

/** Accessible listbox (WAI-ARIA select-only combobox) styled to match the portal; drop-in for a native <select> in forms. */
export default function Select({ options, name, id, defaultValue = "", onChange, className = "", ...rest }: Props) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => { setActive(selectedIndex); setOpen(true); requestAnimationFrame(() => listRef.current?.focus()); };
  const close = () => { setOpen(false); buttonRef.current?.focus(); };
  const choose = (i: number) => {
    const v = options[i].value;
    setValue(v);
    onChange?.(v);
    close();
  };

  /** Type-ahead: jump to the first option starting with the typed letters. */
  const typeahead = (key: string) => {
    const now = Date.now();
    typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : "") + key.toLowerCase(), at: now };
    const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
    if (i >= 0) setActive(i);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(last, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(last); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) typeahead(e.key);
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button ref={buttonRef} id={id} type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={rest["aria-label"]}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); } }}
        className={`input flex items-center justify-between gap-2 text-left ${open ? "border-navy-2 ring-3 ring-navy-2/15" : ""}`}>
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul ref={listRef} id={listId} role="listbox" tabIndex={-1} aria-activedescendant={`${listId}-${active}`} onKeyDown={onListKey}
            initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 z-50 mt-1.5 max-h-72 min-w-44 origin-top overflow-auto rounded-md border border-line bg-white p-1 shadow-[0_12px_32px_-8px_rgba(16,24,40,.22)] outline-none">
            {options.map((o, i) => {
              const isSel = o.value === value;
              return (
                <li key={o.value} id={`${listId}-${i}`} data-index={i} role="option" aria-selected={isSel}
                  onPointerMove={() => setActive(i)} onClick={() => choose(i)}
                  className={`flex cursor-pointer items-start gap-2 rounded px-3 py-2 text-sm ${i === active ? "bg-[#eef3fb]" : ""} ${isSel ? "font-semibold text-navy" : "text-ink"}`}>
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isSel ? "text-navy" : "invisible"}`} />
                  <span className="min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.description && <span className="block text-xs font-normal text-slate-500">{o.description}</span>}
                  </span>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
