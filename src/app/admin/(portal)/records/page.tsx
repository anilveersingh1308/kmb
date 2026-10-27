import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RecordsTable from "@/components/admin/RecordsTable";
import ExportButton from "@/components/admin/ExportDialog";
import Select from "@/components/ui/Select";
import DateRangePicker from "@/components/ui/DateRangePicker";
import type { ParticipantRecord } from "@/lib/types";

const PAGE_SIZE = 50;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function RecordsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const source = typeof sp.source === "string" ? sp.source : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("employees").select("role").eq("id", user!.id).single();

  let query = supabase.from("participant_records").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    query = query.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%,bag_number.ilike.%${safe}%,serial_no.ilike.%${safe}%`);
  }
  if (source === "web" || source === "mobile_app") query = query.eq("source", source);
  if (from) query = query.gte("deposit_date", from);
  if (to) query = query.lte("deposit_date", to);
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data, count, error } = await query;
  const rows = (data ?? []) as ParticipantRecord[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string> = { q, source, from, to, page: String(page), ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])) };
    for (const [k, v] of Object.entries(merged)) if (v && v !== "1") p.set(k, v);
    return `?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Records</h1>
          <p className="text-sm text-slate-600">{total.toLocaleString("en-IN")} participant{total === 1 ? "" : "s"}{q ? ` matching “${q}”` : ""}</p>
        </div>
        <ExportButton filters={{ q, source, from, to }} />
      </div>

      <form className="glass grid gap-3 rounded-md p-4 md:grid-cols-[minmax(0,1fr)_11rem_17rem_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input name="q" defaultValue={q} className="input pl-10" placeholder="Search name, phone, email, bag no, serial…" aria-label="Search records" />
        </div>
        <Select name="source" defaultValue={source} aria-label="Source" options={[
          { value: "", label: "All sources" },
          { value: "web", label: "Web", description: "Issued at the collection booth" },
          { value: "mobile_app", label: "Mobile app", description: "Sent from the field app" },
        ]} />
        <DateRangePicker fromName="from" toName="to" defaultFrom={from} defaultTo={to} />
        <button className="btn-gold rounded-md px-5 py-2.5 font-semibold">Filter</button>
      </form>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error.message}</p>
      ) : (
        <RecordsTable rows={rows} isAdmin={me?.role === "admin"} />
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Link aria-disabled={page <= 1} className={`btn-ghost rounded-xl px-4 py-2 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`} href={qs({ page: page - 1 })}>Previous</Link>
          <span className="px-3 text-slate-600">Page {page} of {pages}</span>
          <Link aria-disabled={page >= pages} className={`btn-ghost rounded-xl px-4 py-2 ${page >= pages ? "pointer-events-none opacity-40" : ""}`} href={qs({ page: page + 1 })}>Next</Link>
        </div>
      )}
    </div>
  );
}
