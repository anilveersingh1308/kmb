"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { GALLERY, type GalleryGroup } from "@/lib/photos";
import type { Lang } from "@/lib/i18n";

const INITIAL = 8;
const LABELS: Record<Lang, Record<"all" | GalleryGroup, string> & { more: (n: number) => string; less: string; close: string; prev: string; next: string; open: string }> = {
  hi: { all: "सभी", pilgrims: "श्रद्धालु", booth: "कलेक्शन बूथ", team: "स्वच्छता दल", more: (n) => `सभी ${n} फ़ोटो देखें`, less: "कम दिखाएं", close: "बंद करें", prev: "पिछली फ़ोटो", next: "अगली फ़ोटो", open: "बड़ा करके देखें" },
  en: { all: "All", pilgrims: "Pilgrims", booth: "Collection booth", team: "On-ground team", more: (n) => `Show all ${n} photos`, less: "Show fewer", close: "Close", prev: "Previous photo", next: "Next photo", open: "View larger" },
};

/** Filterable gallery + accessible lightbox. Thumbnails lazy-load with blur placeholders; full size loads only when opened. */
export default function PhotoGallery({ lang }: { lang: Lang }) {
  const t = LABELS[lang];
  const [group, setGroup] = useState<"all" | GalleryGroup>("all");
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => (group === "all" ? GALLERY : GALLERY.filter((p) => p.group === group)), [group]);
  const visible = expanded ? items : items.slice(0, INITIAL);
  const counts = useMemo(() => ({
    all: GALLERY.length,
    pilgrims: GALLERY.filter((p) => p.group === "pilgrims").length,
    booth: GALLERY.filter((p) => p.group === "booth").length,
    team: GALLERY.filter((p) => p.group === "team").length,
  }), []);

  const show = (i: number, from: HTMLElement) => { lastFocus.current = from; setOpen(i); };
  const close = useCallback(() => { setOpen(null); lastFocus.current?.focus(); }, []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (open === null) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; removeEventListener("keydown", onKey); };
  }, [open, close, step]);

  // Swipe on touch screens
  const touchX = useRef(0);

  const current = open === null ? null : items[open];

  return (
    <>
      <div role="tablist" aria-label={t.all} className="mt-6 flex flex-wrap gap-2">
        {(["all", "pilgrims", "booth", "team"] as const).map((g) => (
          <button key={g} role="tab" type="button" aria-selected={group === g} onClick={() => { setGroup(g); setExpanded(false); }}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${group === g ? "border-navy bg-navy text-white" : "border-[#b9c4d4] bg-white text-navy hover:border-navy-2 hover:bg-[#eef3fb]"}`}>
            {t[g]}
            <span className={`rounded-full px-1.5 text-xs font-bold ${group === g ? "bg-white/20" : "bg-[#eef3fb]"}`}>{counts[g]}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p, i) => {
          const cap = lang === "hi" ? p.hi : p.en;
          return (
            <li key={p.src.src}>
              <button type="button" onClick={(e) => show(i, e.currentTarget)} aria-label={`${t.open}: ${cap}`}
                className="group relative block aspect-[4/5] w-full overflow-hidden rounded-lg border border-line bg-[#e9eef5] text-left focus-visible:outline-offset-4">
                <Image src={p.src} alt={cap} fill placeholder="blur" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                  style={{ objectPosition: p.pos ?? "50% 50%" }} className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(11,31,64,.85),transparent)] px-3 pb-2.5 pt-8 text-xs font-medium leading-snug text-white">{cap}</span>
                <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy opacity-0 shadow transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Expand className="h-4 w-4" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {items.length > INITIAL && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setExpanded((x) => !x)} className="btn-ghost rounded-md px-5 py-2.5 text-sm font-semibold">
            {expanded ? t.less : t.more(items.length)}
          </button>
        </div>
      )}

      {current && open !== null && (
        <div role="dialog" aria-modal="true" aria-label={lang === "hi" ? current.hi : current.en}
          className="fixed inset-0 z-[100] flex flex-col bg-[rgba(8,20,42,.94)] text-white"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }}>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="tabular-nums opacity-80">{open + 1} / {items.length}</span>
            <button ref={closeRef} type="button" onClick={close} aria-label={t.close} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <Image key={current.src.src} src={current.src} alt={lang === "hi" ? current.hi : current.en} fill placeholder="blur" sizes="100vw" className="object-contain" />
            <button type="button" onClick={() => step(-1)} aria-label={t.prev}
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20 sm:left-4">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => step(1)} aria-label={t.next}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20 sm:right-4">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          <p className={`px-4 py-4 text-center text-sm ${lang === "hi" ? "font-devanagari" : ""}`}>{lang === "hi" ? current.hi : current.en}</p>
        </div>
      )}
    </>
  );
}
