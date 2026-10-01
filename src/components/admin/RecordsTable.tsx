"use client";

import { useState, useTransition } from "react";
import { Copy, Check, ExternalLink, Mail, Trash2, Pencil, Smartphone, Globe } from "lucide-react";
import { resendEmail, deleteParticipant, updateParticipantName } from "@/app/admin/actions";
import { certificateUrl, type ParticipantRecord } from "@/lib/types";

const STATUS: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-rose-500/15 text-rose-300",
  skipped_no_email: "bg-amber-500/15 text-amber-300",
  skipped_disabled: "bg-white/10 text-slate-300",
  queued: "bg-sky-500/15 text-sky-300",
};

export default function RecordsTable({ rows, isAdmin }: { rows: ParticipantRecord[]; isAdmin: boolean }) {
  if (rows.length === 0) {
    return <div className="glass rounded-2xl p-10 text-center text-slate-400">No records match these filters.</div>;
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Bag</th>
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => <Row key={r.id} r={r} isAdmin={isAdmin} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ r, isAdmin }: { r: ParticipantRecord; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(r.last_email_status ?? (r.email ? "queued" : "skipped_no_email"));
  const [name, setName] = useState(r.full_name);
  const [gone, setGone] = useState(false);
  const url = certificateUrl(r.token);
  if (gone) return null;

  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const rename = () => {
    const v = prompt("Correct the participant name as it should appear on the certificate:", name);
    if (!v || v.trim() === name) return;
    start(async () => { const res = await updateParticipantName(r.id, v); if (res.ok) setName(v.trim()); else alert(res.error); });
  };
  const remove = () => {
    if (!confirm(`Delete ${name} (${r.serial_no})? The certificate link will stop working.`)) return;
    start(async () => { const res = await deleteParticipant(r.id); if (res.ok) setGone(true); else alert(res.error); });
  };

  return (
    <tr className={`align-top transition hover:bg-white/[.03] ${pending ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <div className="font-semibold text-white">{name}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          {r.source === "mobile_app" ? <Smartphone className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
          {r.source === "mobile_app" ? "Mobile app" : "Web"}{r.created_by_employee_id ? ` · ${r.created_by_employee_id}` : ""}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-300">
        <div>{r.phone ?? <span className="text-slate-500">—</span>}</div>
        <div className="text-xs text-slate-400">{r.email ?? <span className="text-slate-500">no email</span>}</div>
      </td>
      <td className="px-4 py-3 text-slate-300">
        <div className="font-mono text-xs">{r.bag_number}</div>
        <div className="text-xs text-slate-400">{r.bag_quantity} bag{r.bag_quantity > 1 ? "s" : ""} · {Number(r.waste_kg).toFixed(2)} kg</div>
        {r.inventory_items?.length > 0 && <div className="mt-0.5 text-[11px] text-slate-500">{r.inventory_items.join(", ")}</div>}
      </td>
      <td className="px-4 py-3">
        <div className="font-mono text-xs text-gold-light">{r.serial_no}</div>
        <div className="text-[11px] text-slate-500">{r.view_count} view{r.view_count === 1 ? "" : "s"}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[status] ?? STATUS.queued}`}>{status.replace(/_/g, " ")}</span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">
        {new Date(r.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <IconBtn title="Copy link" onClick={copy}>{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}</IconBtn>
          <a href={url} target="_blank" rel="noopener noreferrer" title="Open certificate" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><ExternalLink className="h-4 w-4" /></a>
          <IconBtn title="Resend email" disabled={!r.email || pending}
            onClick={() => start(async () => { const res = await resendEmail(r.certificate_id); setStatus(res.status); })}>
            <Mail className="h-4 w-4" />
          </IconBtn>
          {isAdmin && (
            <>
              <IconBtn title="Edit name" onClick={rename}><Pencil className="h-4 w-4" /></IconBtn>
              <IconBtn title="Delete" onClick={remove} danger><Trash2 className="h-4 w-4" /></IconBtn>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function IconBtn({ children, title, onClick, disabled, danger }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} disabled={disabled}
      className={`rounded-lg p-2 transition disabled:opacity-30 ${danger ? "text-rose-300 hover:bg-rose-500/15" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
      {children}
    </button>
  );
}
