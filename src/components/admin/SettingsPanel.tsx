"use client";

import { useState, useTransition } from "react";
import { Mail, Bell, Send, CheckCircle2, XCircle, Server, Save, Info } from "lucide-react";
import { saveEmailSettings, saveNotificationSettings, sendTestEmail } from "@/app/admin/actions";
import type { AppSettings, EmailSettings } from "@/lib/types";

interface Props {
  settings: AppSettings;
  myEmail: string;
  env: { resend: boolean; from: string; replyTo: string; siteUrl: string; cron: boolean };
  recentLogs: { id: number; to_email: string | null; status: string; kind: string; error: string | null; attempted_at: string }[];
}

type Msg = { ok: boolean; text: string } | null;

export default function SettingsPanel({ settings, myEmail, env, recentLogs }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Settings</h1>
        <p className="text-sm text-slate-400">Email delivery, staff notifications and system status. Changes apply immediately.</p>
      </div>

      <StatusStrip env={env} />

      <div className="grid gap-6 xl:grid-cols-2">
        <EmailCard initial={settings.email} />
        <div className="space-y-6">
          <NotificationsCard initial={settings.notifications} />
          <TestCard myEmail={myEmail} />
        </div>
      </div>

      <RecentLogs logs={recentLogs} />
    </div>
  );
}

function StatusStrip({ env }: { env: Props["env"] }) {
  const items = [
    ["Email provider (Resend)", env.resend, env.resend ? "API key configured" : "RESEND_API_KEY missing — emails will fail"],
    ["Default sender", Boolean(env.from), env.from || "EMAIL_FROM not set — using Resend sandbox sender"],
    ["Public site URL", Boolean(env.siteUrl), env.siteUrl || "NEXT_PUBLIC_SITE_URL not set"],
    ["Daily summary cron", env.cron, env.cron ? "CRON_SECRET set (schedule in vercel.json)" : "CRON_SECRET missing"],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, ok, detail]) => (
        <div key={label} className="glass flex items-start gap-3 rounded-2xl p-4">
          {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{label}</div>
            <div className="truncate text-xs text-slate-400" title={detail}>{detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/[.03] p-4 hover:bg-white/[.05]">
      <div>
        <div className="font-medium text-white">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
      </div>
      <span role="switch" aria-checked={checked} tabIndex={0} onClick={() => onChange(!checked)}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-gradient-to-r from-gold-light to-gold-dark" : "bg-white/15"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </span>
    </label>
  );
}

function MsgBox({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p className={`rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>{msg.text}</p>;
}

function EmailCard({ initial }: { initial: EmailSettings }) {
  const [s, setS] = useState<EmailSettings>(initial);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof EmailSettings>(k: K, v: EmailSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  const save = () => start(async () => {
    const r = await saveEmailSettings(s);
    setMsg(r.ok ? { ok: true, text: "Email settings saved." } : { ok: false, text: r.error ?? "Failed" });
  });

  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Mail className="h-5 w-5 text-gold-light" /> Certificate emails</h2>
      <p className="mt-1 text-sm text-slate-400">What participants receive when a certificate is issued.</p>

      <div className="mt-5 space-y-3">
        <Toggle checked={s.enabled} onChange={(v) => set("enabled", v)} label="Email sending enabled" hint="Master switch. When off, nothing is sent (certificates still work via link/QR)." />
        <Toggle checked={s.send_on_issue} onChange={(v) => set("send_on_issue", v)} label="Send automatically on issue" hint="If off, operators can still send manually with “Resend”." />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label className="label">Sender name</label><input className="input" value={s.from_name} onChange={(e) => set("from_name", e.target.value)} maxLength={80} /></div>
        <div><label className="label">Sender address</label><input className="input" placeholder="certificates@yourdomain.in" value={s.from_address} onChange={(e) => set("from_address", e.target.value)} />
          <p className="mt-1 text-[11px] text-slate-500">Must be on a domain verified in Resend. Blank = use EMAIL_FROM from the server.</p></div>
        <div><label className="label">Reply-to</label><input className="input" placeholder="npkedarnath@…" value={s.reply_to} onChange={(e) => set("reply_to", e.target.value)} /></div>
        <div><label className="label">BCC (archive copy)</label><input className="input" placeholder="records@…" value={s.bcc} onChange={(e) => set("bcc", e.target.value)} /></div>
      </div>

      <div className="mt-4 space-y-4">
        <div><label className="label">Subject</label><input className="input" value={s.subject} onChange={(e) => set("subject", e.target.value)} maxLength={200} /></div>
        <div><label className="label">Intro (Hindi)</label><textarea className="input min-h-20 font-devanagari" value={s.intro_hi} onChange={(e) => set("intro_hi", e.target.value)} maxLength={600} /></div>
        <div><label className="label">Intro (English)</label><textarea className="input min-h-20" value={s.intro_en} onChange={(e) => set("intro_en", e.target.value)} maxLength={600} /></div>
        <div><label className="label">Footer line</label><input className="input font-devanagari" value={s.footer_note} onChange={(e) => set("footer_note", e.target.value)} maxLength={120} /></div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn-gold inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> {pending ? "Saving…" : "Save email settings"}</button>
        <MsgBox msg={msg} />
      </div>
    </section>
  );
}

function NotificationsCard({ initial }: { initial: AppSettings["notifications"] }) {
  const [n, setN] = useState({ ...initial, recipients: initial.recipients.join(", "), summary_recipients: initial.summary_recipients.join(", ") });
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    const r = await saveNotificationSettings(n);
    setMsg(r.ok ? { ok: true, text: "Notification settings saved." } : { ok: false, text: r.error ?? "Failed" });
  });
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Bell className="h-5 w-5 text-gold-light" /> Staff notifications</h2>
      <p className="mt-1 text-sm text-slate-400">Internal alerts for supervisors. Uses the same sender as certificate emails.</p>
      <div className="mt-5 space-y-3">
        <Toggle checked={n.notify_on_issue} onChange={(v) => setN({ ...n, notify_on_issue: v })} label="Alert on every certificate issued" hint="High volume on busy days — best for a shared mailbox." />
        <Toggle checked={n.notify_on_failure} onChange={(v) => setN({ ...n, notify_on_failure: v })} label="Alert when a participant email fails" hint="Recommended, so a volunteer can call or WhatsApp the link." />
      </div>
      <div className="mt-4"><label className="label">Alert recipients</label>
        <input className="input" placeholder="eo@…, supervisor@…" value={n.recipients} onChange={(e) => setN({ ...n, recipients: e.target.value })} /></div>
      <div className="mt-5 space-y-3">
        <Toggle checked={n.daily_summary} onChange={(v) => setN({ ...n, daily_summary: v })} label="Daily summary email" hint="Totals, kg removed and per-operator counts, sent every night (21:00 IST via cron)." />
      </div>
      <div className="mt-4"><label className="label">Summary recipients</label>
        <input className="input" placeholder="eo@…, dm-office@…" value={n.summary_recipients} onChange={(e) => setN({ ...n, summary_recipients: e.target.value })} /></div>
      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn-gold inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> {pending ? "Saving…" : "Save notifications"}</button>
        <MsgBox msg={msg} />
      </div>
    </section>
  );
}

function TestCard({ myEmail }: { myEmail: string }) {
  const [to, setTo] = useState(myEmail);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Send className="h-5 w-5 text-gold-light" /> Send a test email</h2>
      <p className="mt-1 text-sm text-slate-400">Confirms the provider, sender domain and reply-to are working.</p>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await sendTestEmail(to); setMsg(r.ok ? { ok: true, text: `Sent to ${to}. Check the inbox (and spam).` } : { ok: false, text: r.error ?? "Failed" }); }); }}>
        <input className="input flex-1" type="email" value={to} onChange={(e) => setTo(e.target.value)} required />
        <button disabled={pending} className="btn-ghost rounded-xl px-4 font-semibold disabled:opacity-60">{pending ? "Sending…" : "Send"}</button>
      </form>
      <div className="mt-3"><MsgBox msg={msg} /></div>
      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/[.03] p-3 text-xs text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
        <p><b className="text-slate-200">OTP / magic-link emails</b> for staff sign-in are sent by Supabase Auth, not by this app. To brand them and lift the 2-per-hour default limit, set Resend as the custom SMTP in Supabase → Authentication → SMTP Settings, and put <code>{"{{ .Token }}"}</code> in the “Magic Link” template so the 6-digit code appears.</p>
      </div>
    </section>
  );
}

function RecentLogs({ logs }: { logs: Props["recentLogs"] }) {
  const color: Record<string, string> = { sent: "text-emerald-300", failed: "text-rose-300", skipped_no_email: "text-amber-300", skipped_disabled: "text-slate-400", queued: "text-sky-300" };
  return (
    <section className="glass overflow-hidden rounded-3xl">
      <h2 className="flex items-center gap-2 px-6 py-4 font-semibold text-white"><Server className="h-4 w-4 text-gold-light" /> Recent email activity</h2>
      {logs.length === 0 ? <p className="px-6 pb-6 text-sm text-slate-400">No emails sent yet.</p> : (
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400"><tr><th className="px-6 py-2">When</th><th className="px-4 py-2">Kind</th><th className="px-4 py-2">To</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-6 py-2 text-xs text-slate-400">{new Date(l.attempted_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-2 text-slate-300">{l.kind}</td>
                <td className="max-w-[260px] truncate px-4 py-2 text-slate-300">{l.to_email ?? "—"}</td>
                <td className={`px-4 py-2 font-semibold ${color[l.status] ?? ""}`} title={l.error ?? ""}>{l.status.replace(/_/g, " ")}{l.error ? " ⓘ" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
