"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/** Persists the choice in a cookie and re-renders the current route in that language. */
export default function LangToggle({ lang, className = "" }: { lang: Lang; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const next: Lang = lang === "hi" ? "en" : "hi";

  const toggle = () => {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const sp = new URLSearchParams(params.toString());
    sp.set("lang", next);
    start(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
      router.refresh();
    });
  };

  return (
    <button onClick={toggle} disabled={pending} aria-label={`Switch language to ${next === "en" ? "English" : "Hindi"}`}
      className={`glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15 disabled:opacity-60 ${className}`}>
      <Languages className="h-4 w-4 text-gold-light" />
      <span className={lang === "hi" ? "text-gold-light" : "text-slate-400"}>हिं</span>
      <span className="text-slate-500">/</span>
      <span className={lang === "en" ? "text-gold-light" : "text-slate-400"}>EN</span>
    </button>
  );
}
