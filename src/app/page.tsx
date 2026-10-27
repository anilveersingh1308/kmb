import { unstable_cache } from "next/cache";
import Landing from "@/components/Landing";
import { createPublicClient } from "@/lib/certificates";
import { getLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

/** Public counters change slowly — reuse them for a minute instead of hitting Supabase on every page view. */
const getCounts = unstable_cache(
  async () => {
    try {
      const { data } = await createPublicClient().rpc("public_counts");
      if (data) return { certificates: Number(data.certificates), bags: Number(data.bags), kg: Number(data.kg) };
    } catch {
      // Supabase not configured yet — show zeros.
    }
    return { certificates: 0, bags: 0, kg: 0 };
  },
  ["public_counts"],
  { revalidate: 60 },
);

export default async function HomePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: langParam } = await searchParams;
  const [lang, counts] = await Promise.all([getLang(langParam), getCounts()]);
  return <Landing counts={counts} lang={lang} />;
}
