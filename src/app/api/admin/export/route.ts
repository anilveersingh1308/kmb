import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { certificateUrl, type ParticipantRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function csvCell(v: unknown) {
  const s = v == null ? "" : Array.isArray(v) ? v.join(" | ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().replace(/[%,()]/g, " ");
  const source = sp.get("source") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  let query = supabase.from("participant_records").select("*").order("created_at", { ascending: false }).limit(10000);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,bag_number.ilike.%${q}%,serial_no.ilike.%${q}%`);
  if (source === "web" || source === "mobile_app") query = query.eq("source", source);
  if (from) query = query.gte("deposit_date", from);
  if (to) query = query.lte("deposit_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const header = ["Serial", "Name", "Email", "Phone", "Bag Number", "Bags", "Waste (kg)", "Inventory Items", "Source", "Operator", "Deposit Date", "Created At", "Email Status", "Views", "Certificate URL"];
  const lines = (data as ParticipantRecord[]).map((r) => [
    r.serial_no, r.full_name, r.email, r.phone, r.bag_number, r.bag_quantity, r.waste_kg, r.inventory_items, r.source,
    r.created_by_employee_id, r.deposit_date, r.created_at, r.last_email_status ?? "", r.view_count, certificateUrl(r.token),
  ].map(csvCell).join(","));

  // UTF-8 BOM so Excel renders Devanagari correctly
  const body = "\uFEFF" + [header.join(","), ...lines].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="carry-me-back-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
