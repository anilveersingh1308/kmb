import Landing from "@/components/Landing";
import { createPublicClient } from "@/lib/certificates";
import { getLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: langParam } = await searchParams;
  const lang = await getLang(langParam);
  let counts = { certificates: 0, bags: 0, kg: 0 };
  try {
    const { data } = await createPublicClient().rpc("public_counts");
    if (data) counts = { certificates: Number(data.certificates), bags: Number(data.bags), kg: Number(data.kg) };
  } catch {
    // Supabase not configured yet — show zeros.
  }
  return <Landing counts={counts} lang={lang} />;
}
