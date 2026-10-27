"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Phone, Lock } from "lucide-react";
import LangToggle from "./LangToggle";
import { SITE, HELPLINE } from "@/lib/site-text";
import type { Lang } from "@/lib/i18n";

const SIZES = ["87.5%", "100%", "112.5%"] as const;
const SIZE_KEY = "cmb_text_size";

/** GIGW text-size control (A- / A / A+). Scales rem-based layout; the certificate canvas is px and unaffected. */
function TextSize({ label }: { label: string }) {
  const [i, setI] = useState(1);
  useEffect(() => {
    try {
      // Nothing saved → keep the default. (Number(null) is 0, which used to shrink every first visit to "A-".)
      const raw = localStorage.getItem(SIZE_KEY);
      const saved = raw === null ? NaN : Number(raw);
      if (Number.isInteger(saved) && saved >= 0 && saved < SIZES.length) setI(saved);
    } catch { /* storage unavailable */ }
  }, []);
  // The default size leaves <html> untouched (no inline style) so server and client markup match.
  useEffect(() => {
    const root = document.documentElement.style;
    if (i === 1) root.removeProperty("font-size"); else root.fontSize = SIZES[i];
  }, [i]);
  // Persist only an explicit choice; the default is "nothing stored".
  const choose = (k: number) => {
    setI(k);
    try { if (k === 1) localStorage.removeItem(SIZE_KEY); else localStorage.setItem(SIZE_KEY, String(k)); } catch { /* storage unavailable */ }
  };
  return (
    <div role="group" aria-label={label} className="flex items-center">
      {(["A-", "A", "A+"] as const).map((t, k) => (
        <button key={t} type="button" onClick={() => choose(k)} aria-pressed={i === k} aria-label={`${label} ${t}`}
          className={`min-w-7 rounded px-1.5 py-0.5 text-xs font-bold transition hover:bg-white/15 ${i === k ? "bg-white/20" : ""}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

export default function GovHeader({ lang, active = "home" }: { lang: Lang; active?: keyof (typeof SITE)["en"]["nav"] }) {
  const t = SITE[lang];
  const [open, setOpen] = useState(false);
  const links: [keyof typeof t.nav, string][] = [
    ["home", "/"], ["about", "/#about"], ["how", "/#how"], ["gallery", "/#gallery"], ["verify", "/#verify"], ["contact", "/#contact"],
  ];
  const hi = lang === "hi" ? "font-devanagari" : "";

  // Off-screen sections use content-visibility (fast first paint) but report placeholder heights, which would make
  // #anchor jumps land in the wrong place. Lay everything out right before any in-page jump.
  useEffect(() => {
    const root = document.documentElement;
    const hashTarget = (href: string | null) => {
      if (!href) return null;
      const url = new URL(href, location.href);
      return url.pathname === location.pathname && url.hash.length > 1 ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
    };
    if (location.hash.length > 1) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) { root.classList.add("cv-off"); requestAnimationFrame(() => el.scrollIntoView({ behavior: "instant" })); }
    }
    // Capture phase: runs before the browser performs the anchor scroll.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href*='#']");
      if (a && hashTarget(a.getAttribute("href"))) root.classList.add("cv-off");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <>
      <header>
      <a href="#main" className="skip-link">{t.skip}</a>

      {/* Utility bar */}
      <div className="bg-navy text-white">
        {/* Fixed band heights: a web-font swap in these mixed Hindi/English lines must never move the page (CLS). */}
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-3 overflow-hidden px-4 text-xs sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/uttarakhand-logo.png" alt="" className="h-4 w-4 shrink-0 rounded-sm bg-white" />
            <span className="truncate font-devanagari font-semibold">उत्तराखण्ड सरकार</span>
            <span className="hidden opacity-60 sm:inline">|</span>
            <span className="hidden truncate sm:inline">Government of Uttarakhand</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <a href="#main" className="hidden rounded px-1.5 py-0.5 hover:bg-white/15 md:inline">{t.skip}</a>
            <span className="hidden opacity-40 md:inline">|</span>
            <TextSize label={t.textSize} />
            <span className="opacity-40">|</span>
            <Suspense fallback={<span className="px-2 text-xs opacity-75">हिन्दी | English</span>}><LangToggle lang={lang} /></Suspense>
          </div>
        </div>
      </div>

      {/* Identity band */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex h-[84px] max-w-7xl items-center justify-between gap-4 overflow-hidden px-4 sm:h-[92px] sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image src="/img/uttarakhand.webp" alt="उत्तराखण्ड राज्य प्रतीक / Emblem of Uttarakhand" width={64} height={64} priority className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" />
            <div className="min-w-0 border-l-2 border-saffron pl-3 leading-tight">
              <div className={`truncate text-lg font-bold text-navy sm:text-2xl ${hi}`}>{t.org}</div>
              <div className={`truncate text-sm font-semibold text-slate-700 ${lang === "en" ? "font-devanagari" : ""}`}>{t.orgSub}</div>
              <div className={`truncate text-xs text-slate-500 ${hi}`}>{t.district}</div>
            </div>
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <div className="text-right leading-tight">
              <div className={`text-base font-bold text-saffron ${hi}`}>{t.campaign}</div>
              <div className="text-xs font-semibold text-indiagreen">{t.campaignTag}</div>
              <a href={`tel:+91${HELPLINE}`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline">
                <Phone className="h-3.5 w-3.5" /> {HELPLINE}
              </a>
            </div>
            <Image src="/img/healing-himalayas.webp" alt="Healing Himalayas" width={56} height={56} className="h-14 w-14 object-contain" />
          </div>
        </div>
      </div>

      </header>

      {/* Primary navigation — sticky against the page, so it sits outside <header> */}
      <nav aria-label="Primary" className="sticky top-0 z-40 bg-navy-2 text-white shadow-sm">
        <div className="mx-auto flex h-11 max-w-7xl items-center justify-between px-2 sm:px-4">
          <ul className={`hidden h-full items-stretch lg:flex ${hi}`}>
            {links.map(([k, href]) => (
              <li key={k}>
                <a href={href} aria-current={active === k ? "page" : undefined}
                  className={`flex h-full items-center border-b-[3px] px-4 text-sm font-medium transition hover:bg-white/10 ${active === k ? "border-saffron bg-white/10" : "border-transparent"}`}>
                  {t.nav[k]}
                </a>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav"
            className={`inline-flex h-full items-center gap-2 px-3 text-sm font-semibold lg:hidden ${hi}`}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />} {t.menu}
          </button>
          <Link href="/admin/login" className={`inline-flex items-center gap-1.5 rounded bg-saffron px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#e06a10] ${hi}`}>
            <Lock className="h-4 w-4" /> {t.nav.staff}
          </Link>
        </div>
        {open && (
          <ul id="mobile-nav" className={`border-t border-white/15 pb-2 lg:hidden ${hi}`}>
            {links.map(([k, href]) => (
              <li key={k}>
                <a href={href} onClick={() => setOpen(false)} className={`block px-5 py-2.5 text-sm hover:bg-white/10 ${active === k ? "border-l-4 border-saffron bg-white/10" : ""}`}>
                  {t.nav[k]}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="tricolor" />
      </nav>
    </>
  );
}
