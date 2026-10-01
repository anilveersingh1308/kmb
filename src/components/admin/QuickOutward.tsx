"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Award, Copy, Check, ExternalLink, Mail, MailX, MailWarning, MailMinus, Plus, X, RotateCcw, Sparkles, AlertTriangle } from "lucide-react";
import { issueCertificate, resendEmail, type IssueResult, type DuplicateHit } from "@/app/admin/actions";
import { useCelebration } from "@/components/celebration";
import { certificateUrl, qrVerifyUrl } from "@/lib/types";

type Form = {
  full_name: string; email: string; phone: string; bag_number: string;
  bag_quantity: number; waste_kg: number; inventory_items: string[];
};
const EMPTY: Form = { full_name: "", email: "", phone: "", bag_number: "", bag_quantity: 1, waste_kg: 1, inventory_items: [] };

function titleCase(s: string) {
  return s.toLowerCase().replace(/(^|\s|[-'])\S/g, (c) => c.toUpperCase());
}

export default function QuickOutward() {
  const fire = useCelebration();
  const [form, setForm] = useState<Form>(EMPTY);
  const [inv, setInv] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<IssueResult["record"] | null>(null);
  const [dups, setDups] = useState<DuplicateHit[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const addInv = () => {
    const v = inv.trim().toUpperCase();
    if (v && !form.inventory_items.includes(v)) set("inventory_items", [...form.inventory_items, v]);
    setInv("");
  };

  const submit = (e?: React.FormEvent, force = false) => {
    e?.preventDefault();
    setErrors({});
    setDups(null);
    start(async () => {
      const res = await issueCertificate({ ...form, full_name: titleCase(form.full_name.trim()) }, { force });
      if (!res.ok) {
        if (res.duplicates) { setDups(res.duplicates); return; }
        setErrors(res.fieldErrors ?? { _: res.error ?? "Something went wrong" });
        return;
      }
      setResult(res.record!);
      fire("burst");
    });
  };

  const reset = () => {
    setForm(EMPTY); setInv(""); setErrors({}); setResult(null); setDups(null);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const url = result ? certificateUrl(result.token) : "";
  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* FORM */}
      <section className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Quick Outward</h1>
            <p className="text-sm text-slate-400">Record a bag deposit and issue the certificate instantly.</p>
          </div>
          <span className="hidden rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 sm:inline">Live</span>
        </div>

        <form onSubmit={(e) => submit(e)} className="mt-6 space-y-4" autoComplete="off">
          <div>
            <label className="label" htmlFor="name">Participant name *</label>
            <input id="name" ref={nameRef} className="input text-lg" placeholder="e.g. Shree Vikram" value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)} maxLength={80} required />
            {form.full_name && (
              <p className="mt-1.5 text-xs text-slate-400">On certificate: <span className="font-semibold uppercase tracking-wide text-gold-light">{titleCase(form.full_name.trim())}</span></p>
            )}
            {errors.full_name && <p className="mt-1 text-xs text-rose-300">{errors.full_name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" inputMode="email" className="input" placeholder="pilgrim@example.com" value={form.email}
                onChange={(e) => set("email", e.target.value)} />
              {!form.email && <p className="mt-1.5 text-xs text-amber-300/80">No email → share the link / QR from the success card.</p>}
              {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email}</p>}
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} className="input" placeholder="98xxxxxxxx" value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} />
              {errors.phone && <p className="mt-1 text-xs text-rose-300">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="bag">Bag number *</label>
              <input id="bag" className="input uppercase tracking-wider" placeholder="KB-0123" value={form.bag_number}
                onChange={(e) => set("bag_number", e.target.value.toUpperCase())} required maxLength={40} />
              {errors.bag_number && <p className="mt-1 text-xs text-rose-300">{errors.bag_number}</p>}
            </div>
            <div>
              <label className="label" htmlFor="qty">Bags *</label>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-ghost h-12 w-12 rounded-xl text-xl" onClick={() => set("bag_quantity", Math.max(1, form.bag_quantity - 1))} aria-label="Fewer bags">−</button>
                <input id="qty" type="number" min={1} max={50} className="input text-center" value={form.bag_quantity}
                  onChange={(e) => set("bag_quantity", Math.min(50, Math.max(1, Number(e.target.value) || 1)))} />
                <button type="button" className="btn-ghost h-12 w-12 rounded-xl text-xl" onClick={() => set("bag_quantity", Math.min(50, form.bag_quantity + 1))} aria-label="More bags">+</button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="kg">Waste (kg)</label>
              <input id="kg" type="number" step={0.25} min={0.25} max={500} className="input" value={form.waste_kg}
                onChange={(e) => set("waste_kg", Number(e.target.value) || 1)} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="inv">Inventory items</label>
            <div className="flex gap-2">
              <input id="inv" className="input uppercase" placeholder="INV-778 then Enter" value={inv}
                onChange={(e) => setInv(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInv(); } }} />
              <button type="button" onClick={addInv} className="btn-ghost rounded-xl px-4" aria-label="Add inventory item"><Plus className="h-5 w-5" /></button>
            </div>
            {form.inventory_items.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.inventory_items.map((it) => (
                  <span key={it} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    {it}
                    <button type="button" onClick={() => set("inventory_items", form.inventory_items.filter((x) => x !== it))} aria-label={`Remove ${it}`}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {errors._ && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{errors._}</p>}

          {dups && (
            <div role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-amber-200"><AlertTriangle className="h-4 w-4" /> Possible duplicate</p>
              <p className="mt-1 text-sm text-amber-100/80">The same {dups[0].matched_on} was used in the last 24 hours:</p>
              <ul className="mt-2 space-y-1 text-sm">
                {dups.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-1.5">
                    <span className="text-white">{d.full_name}</span>
                    <span className="font-mono text-xs text-slate-300">{d.serial_no} · {new Date(d.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => submit(undefined, true)} disabled={pending} className="btn-gold rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">Issue anyway (different pilgrim)</button>
                <button type="button" onClick={() => setDups(null)} className="btn-ghost rounded-xl px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button disabled={pending} className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-lg font-semibold disabled:opacity-60">
              <Award className="h-5 w-5" /> {pending ? "Issuing…" : "Issue Certificate"}
            </button>
            <button type="button" onClick={reset} className="btn-ghost rounded-2xl px-4" title="Clear form"><RotateCcw className="h-5 w-5" /></button>
          </div>
        </form>
      </section>

      {/* RESULT */}
      <section className="relative">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key={result.id} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 110, damping: 16 }}
              className="glass relative overflow-hidden rounded-3xl p-6 sm:p-7">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
              <div className="flex items-center gap-2 text-emerald-300"><Sparkles className="h-5 w-5" /> <span className="text-sm font-semibold uppercase tracking-wider">Certificate issued</span></div>
              <h2 className="mt-2 text-2xl font-bold uppercase tracking-wide text-white">{result.full_name}</h2>
              <p className="text-sm text-slate-400">Serial <b className="text-gold-light">{result.serial_no}</b></p>

              <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
                <div className="rounded-2xl bg-white p-3 text-center">
                  <QRCodeSVG value={qrVerifyUrl(result.token)} size={148} level="M" />
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Unique verification QR</div>
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  <EmailBadge status={result.email_status} />
                  <p className="break-all rounded-xl bg-black/30 p-3 font-mono text-xs text-slate-300">{url}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button onClick={copy} className="btn-ghost flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy link"}
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm">
                  <ExternalLink className="h-4 w-4" /> Open
                </a>
                <ResendButton certificateId={result.certificate_id} onDone={(s) => setResult({ ...result, email_status: s })} />
                <button onClick={reset} className="btn-gold flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold">
                  <Plus className="h-4 w-4" /> Next
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl p-8 text-center">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-gold/30 animate-pulse-ring" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/5"><Award className="h-7 w-7 text-gold-light" /></div>
              </div>
              <p className="mt-5 font-semibold text-white">Ready for the next pilgrim</p>
              <p className="mt-1 max-w-xs text-sm text-slate-400">Fill the form and press <b>Issue Certificate</b>. The email goes out automatically; the QR appears here for those without email.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function EmailBadge({ status }: { status: string }) {
  const map: Record<string, [string, string, typeof Mail]> = {
    sent: ["Email sent", "text-emerald-300 bg-emerald-500/10", Mail],
    skipped_no_email: ["No email – share link/QR", "text-amber-300 bg-amber-500/10", MailWarning],
    skipped_disabled: ["Auto-email off – send manually", "text-slate-300 bg-white/10", MailMinus],
    failed: ["Email failed – retry", "text-rose-300 bg-rose-500/10", MailX],
    queued: ["Email queued", "text-sky-300 bg-sky-500/10", Mail],
  };
  const [label, cls, Icon] = map[status] ?? map.queued;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}><Icon className="h-4 w-4" /> {label}</span>;
}

function ResendButton({ certificateId, onDone }: { certificateId: string; onDone: (s: string) => void }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(async () => { const r = await resendEmail(certificateId); onDone(r.status); })}
      className="btn-ghost flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm disabled:opacity-60">
      <Mail className="h-4 w-4" /> {pending ? "Sending…" : "Resend"}
    </button>
  );
}
