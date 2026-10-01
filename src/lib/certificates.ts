import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { PublicCertificate } from "./types";

/** Anonymous, cookie-less client for public reads through security-definer RPCs. */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchPublicCertificate(token: string): Promise<PublicCertificate | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const { data, error } = await createPublicClient().rpc("get_certificate", { p_token: token });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = (Array.isArray(data) ? data[0] : data) as PublicCertificate;
  return { ...row, waste_kg: Number(row.waste_kg) };
}
