import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/certificates";
import { certificateUrl, type VerificationResult } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/verify/<token> — machine-readable authenticity check for a certificate QR code.
 * Public, read-only, returns no contact details.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    return NextResponse.json({ authentic: false, reason: "malformed_token" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const { data, error } = await createPublicClient().rpc("verify_certificate", { p_token: token });
  const row = (Array.isArray(data) ? data[0] : data) as VerificationResult | undefined;
  if (error || !row) {
    return NextResponse.json({ authentic: false, reason: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    {
      authentic: true,
      serial_no: row.serial_no,
      participant: row.full_name,
      bag_quantity: row.bag_quantity,
      waste_kg: Number(row.waste_kg),
      issued_on: row.issued_on,
      issued_at: row.issued_at,
      issued_by: row.issued_by,
      certificate_url: certificateUrl(token),
      checked_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
