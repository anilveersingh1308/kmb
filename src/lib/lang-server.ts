import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, type Lang } from "./i18n";

/** Language preference: explicit ?lang= wins, then the cookie, then `fallback`. */
export async function getLang(override?: string | null, fallback: Lang = "hi"): Promise<Lang> {
  const q = normalizeLang(override);
  if (q) return q;
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value) ?? fallback;
}
