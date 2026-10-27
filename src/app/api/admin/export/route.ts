import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParticipantRecord } from "@/lib/types";
import { EXPORT_COLUMNS, maskEmail, maskPhone } from "@/lib/export-columns";

export const dynamic = "force-dynamic";

const PAGE = 1000; // Supabase caps a single response at 1,000 rows — page through instead of silently truncating.
const MAX_ROWS = 50_000;

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  // Quote when needed; prefix formula-looking values so Excel never executes them (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * GET /api/admin/export
 *   scope=filtered (default) | all | range      — range uses from/to only; all ignores every filter
 *   q, source, from, to                          — same filters as the Records page
 *   cols=serial,name,…                           — whitelisted column keys (default: all)
 *   mask=1                                       — hide phone numbers and emails
 *   preview=1                                    — return { count } as JSON instead of the file
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("employees").select("is_active").eq("id", user.id).maybeSingle();
  if (!me?.is_active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") === "all" ? "all" : sp.get("scope") === "range" ? "range" : "filtered";
  const q = scope === "filtered" ? (sp.get("q") ?? "").trim().replace(/[%,()]/g, " ") : "";
  const source = scope === "filtered" ? sp.get("source") ?? "" : "";
  const from = scope === "all" ? "" : sp.get("from") ?? "";
  const to = scope === "all" ? "" : sp.get("to") ?? "";
  const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  const build = (head: boolean) => {
    let query = supabase.from("participant_records").select("*", head ? { count: "exact", head: true } : undefined);
    if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,bag_number.ilike.%${q}%,serial_no.ilike.%${q}%`);
    if (source === "web" || source === "mobile_app") query = query.eq("source", source);
    if (isDate(from)) query = query.gte("deposit_date", from);
    if (isDate(to)) query = query.lte("deposit_date", to);
    return query;
  };

  if (sp.get("preview") === "1") {
    const { count, error } = await build(true);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ count: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  }

  const wanted = new Set((sp.get("cols") ?? "").split(",").filter(Boolean));
  const cols = wanted.size ? EXPORT_COLUMNS.filter((c) => wanted.has(c.key)) : EXPORT_COLUMNS;
  if (!cols.length) return NextResponse.json({ error: "Choose at least one column" }, { status: 400 });
  const mask = sp.get("mask") === "1";

  const rows: ParticipantRecord[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const { data, error } = await build(false).order("created_at", { ascending: false }).order("id").range(offset, offset + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    rows.push(...(data as ParticipantRecord[]));
    if (!data || data.length < PAGE) break;
  }

  const lines = rows.map((r) => cols.map((c) => {
    const v = c.get(r);
    if (mask && c.personal && v) return csvCell(c.key === "phone" ? maskPhone(String(v)) : maskEmail(String(v)));
    return csvCell(v);
  }).join(","));
  // UTF-8 BOM so Excel renders Devanagari correctly
  const body = "﻿" + [cols.map((c) => csvCell(c.label)).join(","), ...lines].join("\r\n");

  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const name = (sp.get("filename") ?? "").replace(/[^a-z0-9._-]/gi, "").slice(0, 80) || `carry-me-back_${day}.csv`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name.endsWith(".csv") ? name : `${name}.csv`}"`,
      "Cache-Control": "no-store",
      "X-Row-Count": String(rows.length),
    },
  });
}
