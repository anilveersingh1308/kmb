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
    <button onClick={toggle} disabled={pending} aria-label={`Switch language to ${next === "en" ? "English" : "Hindi"}`} lang={next}
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-60 ${className}`}>
      <Languages className="h-4 w-4" />
      <span className={lang === "hi" ? "underline underline-offset-4" : "opacity-75"}>हिन्दी</span>
      <span className="opacity-50">|</span>
      <span className={lang === "en" ? "underline underline-offset-4" : "opacity-75"}>English</span>
    </button>
  );
}
