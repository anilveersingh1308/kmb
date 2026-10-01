import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCertificateEmail } from "@/lib/email";
import { secretsMatch } from "@/lib/secrets";
import { participantSchema, zodFieldErrors } from "@/lib/validation";
import { certificateUrl } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile-ingest — called by the mobile app's "CARRY ME BACK" screen.
 * Header: x-api-key: <MOBILE_APP_KEY>
 * Idempotent on `client_ref`: resubmitting the same ref returns the existing certificate.
 */
const bodySchema = participantSchema.extend({
  operator_employee_id: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/).optional(),
  client_ref: z.string().trim().min(8).max(80),
});

export async function POST(req: NextRequest) {
  if (!secretsMatch(req.headers.get("x-api-key"), process.env.MOBILE_APP_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", fields: zodFieldErrors(parsed.error) }, { status: 422 });
  const { operator_employee_id, client_ref, ...participant } = parsed.data;

  const admin = createAdminClient();

  // Idempotency: return the existing record for a repeated client_ref
  const { data: existing } = await admin
    .from("participants").select("id, certificates(id, serial_no, token)").eq("client_ref", client_ref).maybeSingle();
  if (existing) {
    const c = Array.isArray(existing.certificates) ? existing.certificates[0] : existing.certificates;
    return NextResponse.json({ serial_no: c?.serial_no, certificate_url: c ? certificateUrl(c.token) : null, email_status: "already_processed", duplicate: true }, { status: 200 });
  }

  let created_by: string | null = null;
  if (operator_employee_id) {
    const { data: emp } = await admin.from("employees").select("id, is_active").eq("employee_id", operator_employee_id).maybeSingle();
    if (!emp || !emp.is_active) return NextResponse.json({ error: "Unknown or inactive operator_employee_id" }, { status: 422 });
    created_by = emp.id;
  }

  const { data: row, error } = await admin
    .from("participants")
    .insert({ ...participant, source: "mobile_app", client_ref, created_by })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "This bag number was already recorded today" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: cert } = await admin.from("certificates").select("id, serial_no, token").eq("participant_id", row.id).single();
  if (!cert) return NextResponse.json({ error: "Certificate generation failed" }, { status: 500 });

  const email = await sendCertificateEmail(cert.id, { auto: true });
  return NextResponse.json(
    { id: row.id, serial_no: cert.serial_no, certificate_url: certificateUrl(cert.token), email_status: email.status },
    { status: 201 },
  );
}
