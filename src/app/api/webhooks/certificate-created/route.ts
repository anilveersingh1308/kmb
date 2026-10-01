import { NextResponse, type NextRequest } from "next/server";
import { sendCertificateEmail } from "@/lib/email";
import { secretsMatch } from "@/lib/secrets";

export const dynamic = "force-dynamic";

/**
 * Supabase Database Webhook target — fires on INSERT into public.certificates.
 * Safety net for rows inserted outside the app (SQL editor, imports). Idempotent.
 * Configure header:  x-webhook-secret: <WEBHOOK_SECRET>
 */
export async function POST(req: NextRequest) {
  if (!secretsMatch(req.headers.get("x-webhook-secret"), process.env.WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let payload: { type?: string; table?: string; record?: { id?: string } };
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (payload.type !== "INSERT" || payload.table !== "certificates" || !payload.record?.id) {
    return NextResponse.json({ ignored: true });
  }
  const res = await sendCertificateEmail(payload.record.id, { auto: true });
  return NextResponse.json(res);
}
