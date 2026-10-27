"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check, CheckCircle2, Copy, ExternalLink, Globe, Loader2, Mail, MessageCircle, Pencil, QrCode, Smartphone, Trash2, TriangleAlert, X,
} from "lucide-react";
import { resendEmail, deleteParticipant, updateParticipantName } from "@/app/admin/actions";
import { certificateUrl, qrVerifyUrl, type ParticipantRecord } from "@/lib/types";
import { whatsappUrl } from "@/lib/share-text";
import ActionMenu, { type MenuItem } from "@/components/ui/ActionMenu";
import Dialog from "@/components/ui/Dialog";

const STATUS: Record<string, [string, string]> = {
  sent: ["Sent", "bg-emerald-100 text-emerald-800"],
  failed: ["Failed", "bg-rose-100 text-rose-800"],
  skipped_no_email: ["No email", "bg-amber-100 text-amber-800"],
  skipped_disabled: ["Auto-email off", "bg-slate-100 text-slate-700"],
  queued: ["Queued", "bg-sky-100 text-sky-800"],
};
const RESEND_MSG: Record<string, [boolean, string]> = {
  sent: [true, "Certificate email sent"],
  failed: [false, "Email failed — check the address or try again"],
  skipped_disabled: [false, "Email sending is switched off in Settings"],
  skipped_no_email: [false, "This record has no email address"],
};

type Toast = { id: number; ok: boolean; text: string };
type Modal = { kind: "edit" | "delete" | "qr"; row: ParticipantRecord } | null;

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s|[-'])\S/g, (c) => c.toUpperCase());

export default function RecordsTable({ rows, isAdmin }: { rows: ParticipantRecord[]; isAdmin: boolean }) {
  // Local overrides so the table reflects edits/deletes/resends immediately.
  const [names, setNames] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<Modal>(null);

  const toast = useCallback((ok: boolean, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, ok, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const visible = rows.filter((r) => !removed.has(r.id));
  if (visible.length === 0) {
    return <div className="glass rounded-md p-10 text-center text-slate-600">No records match these filters.</div>;
  }

  const nameOf = (r: ParticipantRecord) => names[r.id] ?? r.full_name;
  const resend = async (r: ParticipantRecord) => {
    setBusy((b) => ({ ...b, [r.id]: true }));
    const res = await resendEmail(r.certificate_id);
    setBusy((b) => ({ ...b, [r.id]: false }));
    setStatuses((s) => ({ ...s, [r.id]: res.status }));
    const [ok, text] = RESEND_MSG[res.status] ?? [false, res.error ?? "Could not send the email"];
    toast(ok, ok ? `${text} to ${r.email}` : text);
  };

  return (
    <>
      <div className="glass overflow-hidden rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.14em] text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3">Participant</th>
                <th scope="col" className="px-4 py-3">Contact</th>
                <th scope="col" className="px-4 py-3">Bag</th>
                <th scope="col" className="px-4 py-3">Serial</th>
                <th scope="col" className="px-4 py-3">Email</th>
                <th scope="col" className="px-4 py-3">When</th>
                {/* Pinned so actions stay reachable while the table scrolls sideways on small screens */}
                <th scope="col" className="sticky right-0 bg-slate-50 px-4 py-3 text-right shadow-[-8px_0_12px_-10px_rgba(16,24,40,.25)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((r) => (
                <Row key={r.id} r={r} name={nameOf(r)} status={statuses[r.id] ?? r.last_email_status ?? (r.email ? "queued" : "skipped_no_email")}
                  busy={!!busy[r.id]} isAdmin={isAdmin} toast={toast} onResend={() => resend(r)} onModal={(kind) => setModal({ kind, row: r })} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.kind === "edit" && (
        <EditNameDialog row={modal.row} current={nameOf(modal.row)} onClose={() => setModal(null)}
          onSaved={(n) => { setNames((m) => ({ ...m, [modal.row.id]: n })); toast(true, "Name updated — the certificate shows it immediately"); }} />
      )}
      {modal?.kind === "delete" && (
        <DeleteDialog row={modal.row} name={nameOf(modal.row)} onClose={() => setModal(null)}
          onDeleted={() => { setRemoved((s) => new Set(s).add(modal.row.id)); toast(true, `${modal.row.serial_no} deleted`); }} />
      )}
      {modal?.kind === "qr" && <QrDialog row={modal.row} name={nameOf(modal.row)} onClose={() => setModal(null)} toast={toast} />}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[95] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-md border px-3.5 py-2.5 text-sm font-medium shadow-lg ${t.ok ? "border-emerald-200 bg-white text-emerald-900" : "border-rose-200 bg-white text-rose-800"}`}>
            {t.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indiagreen" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
            <span>{t.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="-mr-1 ml-1 text-slate-400 hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}

function Row({ r, name, status, busy, isAdmin, toast, onResend, onModal }: {
  r: ParticipantRecord; name: string; status: string; busy: boolean; isAdmin: boolean;
  toast: (ok: boolean, text: string) => void; onResend: () => void; onModal: (k: "edit" | "delete" | "qr") => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = certificateUrl(r.token);
  const [label, cls] = STATUS[status] ?? STATUS.queued;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); toast(true, "Certificate link copied"); }
    catch { toast(false, "Couldn't copy — open the certificate and copy from the address bar"); }
  };
  const waText = `🙏 Namaste ${name}, thank you for carrying waste back from Kedarnath Dham. Your Certificate of Appreciation from Nagar Panchayat Kedarnath: ${url}`;

  const items: MenuItem[] = [
    { label: busy ? "Sending email…" : status === "sent" ? "Resend email" : "Send email", icon: Mail, onSelect: onResend, disabled: !r.email || busy, hint: r.email ? r.email : "No email on this record" },
    { label: "Send on WhatsApp", icon: MessageCircle, href: r.phone ? whatsappUrl(waText, r.phone) : undefined, disabled: !r.phone, hint: r.phone ? `+91 ${r.phone}` : "No phone on this record" },
    { label: "Show QR code", icon: QrCode, onSelect: () => onModal("qr"), hint: "Let the pilgrim scan it" },
    ...(isAdmin ? [
      { label: "Edit name", icon: Pencil, onSelect: () => onModal("edit"), separated: true } as MenuItem,
      { label: "Delete record", icon: Trash2, onSelect: () => onModal("delete"), danger: true } as MenuItem,
    ] : []),
  ];

  return (
    <tr className={`group align-top transition hover:bg-slate-50 ${busy ? "opacity-70" : ""}`}>
      <td className="px-4 py-3">
        <div className="font-semibold text-ink">{name}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
          {r.source === "mobile_app" ? <Smartphone className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
          {r.source === "mobile_app" ? "Mobile app" : "Web"}{r.created_by_employee_id ? ` · ${r.created_by_employee_id}` : ""}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-700">
        <div>{r.phone ?? <span className="text-slate-500">—</span>}</div>
        <div className="text-xs text-slate-600">{r.email ?? <span className="text-slate-500">no email</span>}</div>
      </td>
      <td className="px-4 py-3 text-slate-700">
        <div className="font-mono text-xs">{r.bag_number ?? <span className="text-slate-500">no bag no.</span>}</div>
        <div className="text-xs text-slate-600">{r.bag_quantity} bag{r.bag_quantity > 1 ? "s" : ""} · {Number(r.waste_kg).toFixed(2)} kg</div>
        {r.inventory_items?.length > 0 && <div className="mt-0.5 text-[11px] text-slate-500">{r.inventory_items.join(", ")}</div>}
      </td>
      <td className="px-4 py-3">
        <div className="font-mono text-xs text-navy">{r.serial_no}</div>
        <div className="text-[11px] text-slate-500">{r.view_count} view{r.view_count === 1 ? "" : "s"}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}{label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">
        <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
      </td>
      <td className="sticky right-0 bg-white px-4 py-3 shadow-[-8px_0_12px_-10px_rgba(16,24,40,.25)] transition group-hover:bg-slate-50">
        <div className="flex items-center justify-end gap-1.5">
          <a href={url} target="_blank" rel="noopener noreferrer" title="Open certificate in a new tab"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-xs font-semibold text-navy transition hover:border-navy-2 hover:bg-[#eef3fb]">
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </a>
          <button type="button" onClick={copy} title="Copy certificate link" aria-label="Copy certificate link"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-slate-700 transition hover:border-[#b9c4d4] hover:text-navy">
            {copied ? <Check className="h-4 w-4 text-indiagreen" /> : <Copy className="h-4 w-4" />}
          </button>
          <ActionMenu items={items} label={`More actions for ${name}`} />
        </div>
      </td>
    </tr>
  );
}

function EditNameDialog({ row, current, onClose, onSaved }: { row: ParticipantRecord; current: string; onClose: () => void; onSaved: (n: string) => void }) {
  const [value, setValue] = useState(current);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const next = titleCase(value.trim().replace(/\s+/g, " "));
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 2) { setError("Enter at least 2 characters."); return; }
    if (next === current) { onClose(); return; }
    start(async () => {
      const res = await updateParticipantName(row.id, next);
      if (!res.ok) { setError(res.error ?? "Could not save"); return; }
      onSaved(next); onClose();
    });
  };
  return (
    <Dialog open onClose={onClose} title="Edit participant name" initialFocus={input}
      description={<>Corrects the name printed on certificate <b className="font-mono">{row.serial_no}</b>. The link and QR code stay the same.</>}
      footer={<>
        <button type="button" onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">Cancel</button>
        <button form="edit-name" disabled={pending} className="btn-gold inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save name
        </button>
      </>}>
      <form id="edit-name" onSubmit={save}>
        <label className="label" htmlFor="edit-name-input">Name on certificate</label>
        <input id="edit-name-input" ref={input} className="input" value={value} maxLength={80} onChange={(e) => { setValue(e.target.value); setError(""); }} />
        {next && next !== value.trim() && <p className="mt-1.5 text-xs text-slate-600">Will be saved as <b className="text-navy">{next}</b></p>}
        {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      </form>
    </Dialog>
  );
}

function DeleteDialog({ row, name, onClose, onDeleted }: { row: ParticipantRecord; name: string; onClose: () => void; onDeleted: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  const del = () => start(async () => {
    const res = await deleteParticipant(row.id);
    if (!res.ok) { setError(res.error ?? "Could not delete"); return; }
    onDeleted(); onClose();
  });
  return (
    <Dialog open onClose={onClose} tone="danger" title="Delete this record?" initialFocus={cancel}
      description={<>This permanently deletes <b>{name}</b> (<span className="font-mono">{row.serial_no}</span>).</>}
      footer={<>
        <button ref={cancel} type="button" onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">Keep record</button>
        <button type="button" onClick={del} disabled={pending} className="inline-flex items-center gap-2 rounded-md border border-rose-700 bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete permanently
        </button>
      </>}>
      <ul className="space-y-1.5 text-sm text-slate-700">
        <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> The certificate link and its QR code will stop working.</li>
        <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> It is removed from Records, Stats and CSV exports.</li>
        <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> This cannot be undone.</li>
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    </Dialog>
  );
}

function QrDialog({ row, name, onClose, toast }: { row: ParticipantRecord; name: string; onClose: () => void; toast: (ok: boolean, t: string) => void }) {
  const url = certificateUrl(row.token);
  return (
    <Dialog open onClose={onClose} title={name} description={<>Certificate <span className="font-mono">{row.serial_no}</span> — scan with a phone camera to open it.</>}
      footer={<>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); toast(true, "Certificate link copied"); } catch { toast(false, "Couldn't copy the link"); } }}
          className="btn-ghost inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"><Copy className="h-4 w-4" /> Copy link</button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-gold inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"><ExternalLink className="h-4 w-4" /> Open</a>
      </>}>
      <div className="flex flex-col items-center">
        <div className="rounded-lg border border-line bg-white p-3"><QRCodeSVG value={qrVerifyUrl(row.token)} size={220} level="M" /></div>
        <p className="mt-3 break-all text-center font-mono text-[11px] text-slate-500">{url}</p>
      </div>
    </Dialog>
  );
}
