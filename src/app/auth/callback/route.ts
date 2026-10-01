import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Magic-link landing: exchanges the PKCE code for a session, then sends staff to the portal. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const next = searchParams.get("next") ?? "/admin";
  const safeNext = next.startsWith("/admin") ? next : "/admin";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    ok = !error;
  }
  if (!ok) return NextResponse.redirect(`${origin}/admin/login?reason=link`);

  await supabase.rpc("touch_last_login");
  return NextResponse.redirect(`${origin}${safeNext}`);
}
