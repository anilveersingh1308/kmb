"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AtSign, Check, CheckCircle2, Circle, Copy, Eye, EyeOff, KeyRound, Loader2, Lock, LockOpen, Mail, RefreshCw, Search, ShieldAlert,
  ShieldCheck, Trash2, TriangleAlert, UserCheck, UserCog, UserPlus, UserX, X,
} from "lucide-react";
import { createEmployee } from "@/app/admin/actions";
import {
  changeStaffEmail, deleteStaff, lockStepUp, requestStepUpCode, resetStaffPassword, setStaffActive, staffImpact, verifyStepUpCode, type AdminResult,
} from "@/app/admin/employees/actions";
import type { Employee } from "@/lib/types";
import Select from "@/components/ui/Select";
import Dialog from "@/components/ui/Dialog";
import ActionMenu, { type MenuItem } from "@/components/ui/ActionMenu";

type Toast = { id: number; ok: boolean; text: string };
type Modal = { kind: "email" | "password" | "delete" | "deactivate"; emp: Employee } | null;
type Filter = "all" | "active" | "inactive" | "admin";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "never");
const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/** Strong, readable temporary password (no 0/O/1/l/I), always with upper, lower, digit and symbol. */
function generatePassword(len = 12) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "@#$%&*?!"];
  const all = sets.join("");
  const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = sets.map((s) => s[rnd(s.length)]);
  while (chars.length < len) chars.push(all[rnd(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join("");
}
const RULES: [string, (p: string) => boolean][] = [
  ["8+ characters", (p) => p.length >= 8], ["A letter", (p) => /[A-Za-z]/.test(p)], ["A number", (p) => /\d/.test(p)],
];

export default function EmployeesPanel({ employees, meId, stepUp }: { employees: Employee[]; meId: string; stepUp: { until: string | null; email: string | null } }) {
  const [until, setUntil] = useState<string | null>(stepUp.until);
  const [now, setNow] = useState(() => Date.now());
  const [modal, setModal] = useState<Modal>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // Pending "verify first" request: what to do once the admin has entered a code.
  const [verifyFor, setVerifyFor] = useState<{ reason: string; then: () => void; cancel?: () => void } | null>(null);

  const unlocked = !!until && new Date(until).getTime() > now;
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);

  const toast = useCallback((ok: boolean, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, ok, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  /** Open a sensitive dialog — after re-verification if the 10-minute window isn't open. */
  const openSensitive = (kind: "email" | "password" | "delete", emp: Employee) => {
    if (unlocked) { setModal({ kind, emp }); return; }
    const reason = { email: `change ${emp.full_name}'s login email`, password: `reset ${emp.full_name}'s password`, delete: `remove ${emp.full_name}` }[kind];
    setVerifyFor({ reason, then: () => setModal({ kind, emp }) });
  };

  /** Runs a protected action; if the server says the window lapsed, ask for a code and retry once. */
  const guarded = useCallback((fn: () => Promise<AdminResult>, reason: string) => new Promise<AdminResult>((resolve) => {
    fn().then((res) => {
      if (res.ok || !("stepUp" in res) || !res.stepUp) { resolve(res); return; }
      setUntil(null);
      setVerifyFor({ reason, then: () => { fn().then(resolve); }, cancel: () => resolve({ ok: false, error: "Cancelled — not verified." }) });
    });
  }), []);

  const counts = useMemo(() => ({
    all: employees.length,
    active: employees.filter((e) => e.is_active).length,
    inactive: employees.filter((e) => !e.is_active).length,
    admin: employees.filter((e) => e.role === "admin").length,
  }), [employees]);
  const list = employees.filter((e) => {
    if (filter === "active" && !e.is_active) return false;
    if (filter === "inactive" && e.is_active) return false;
    if (filter === "admin" && e.role !== "admin") return false;
    const q = query.trim().toLowerCase();
    return !q || [e.full_name, e.employee_id, e.email ?? ""].some((v) => v.toLowerCase().includes(q));
  });

  const secondsLeft = until ? Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000)) : 0;

  return (
    <div className="space-y-6">
      {/* Admin verification status */}
      <div role="status" className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm ${unlocked ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-line bg-white text-slate-700"}`}>
        {unlocked ? <LockOpen className="h-5 w-5 shrink-0 text-indiagreen" /> : <Lock className="h-5 w-5 shrink-0 text-navy" />}
        <p className="min-w-0 flex-1">
          {unlocked
            ? <><b>Admin verification active.</b> Email, password and removal changes are unlocked for <b className="tabular-nums">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</b>.</>
            : <><b>Protected actions.</b> Changing a staff member&apos;s email or password, or removing them, needs a one-time code sent to {stepUp.email ? <b>{stepUp.email}</b> : "your email"}. One code unlocks changes for 10 minutes.</>}
        </p>
        {unlocked ? (
          <button type="button" onClick={async () => { const r = await lockStepUp(); setUntil(null); toast(true, r.ok ? r.message : r.error); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
            <Lock className="h-3.5 w-3.5" /> Lock now
          </button>
        ) : (
          <button type="button" onClick={() => setVerifyFor({ reason: "manage staff accounts", then: () => {} })}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#b9c4d4] bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:bg-[#eef3fb]">
            <ShieldCheck className="h-3.5 w-3.5" /> Verify now
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <AddEmployee toast={toast} />

        {/* Staff list */}
        <section className="glass overflow-hidden rounded-lg">
          <div className="space-y-3 border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-ink">Staff</h2>
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, email" aria-label="Search staff" className="input py-2 pl-9 text-sm" />
              </div>
            </div>
            <div role="tablist" aria-label="Filter staff" className="flex flex-wrap gap-2">
              {(["all", "active", "inactive", "admin"] as const).map((f) => (
                <button key={f} role="tab" type="button" aria-selected={filter === f} onClick={() => setFilter(f)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize transition ${filter === f ? "border-navy bg-navy text-white" : "border-[#b9c4d4] bg-white text-navy hover:bg-[#eef3fb]"}`}>
                  {f === "admin" ? "Admins" : f} <span className={`rounded-full px-1.5 ${filter === f ? "bg-white/20" : "bg-[#eef3fb]"}`}>{counts[f]}</span>
                </button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-600">No staff match.</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.map((e) => {
                const me = e.id === meId;
                const items: MenuItem[] = me ? [
                  { label: "Manage my account", icon: UserCog, onSelect: () => { location.href = "/admin/account"; }, hint: "Your own email & password (verified by code)" },
                ] : [
                  { label: "Change login email", icon: AtSign, onSelect: () => openSensitive("email", e), hint: unlocked ? undefined : "Needs a verification code" },
                  { label: "Reset password", icon: KeyRound, onSelect: () => openSensitive("password", e), hint: unlocked ? undefined : "Needs a verification code" },
                  e.is_active
                    ? { label: "Deactivate", icon: UserX, onSelect: () => setModal({ kind: "deactivate", emp: e }), separated: true, hint: "Blocks sign-in · reversible" }
                    : { label: "Reactivate", icon: UserCheck, separated: true, hint: "Allow sign-in again",
                        onSelect: async () => { const r = await setStaffActive(e.id, true); toast(r.ok, r.ok ? r.message : r.error); } },
                  { label: "Remove staff account", icon: Trash2, danger: true, onSelect: () => openSensitive("delete", e), hint: "Permanent" },
                ];
                return (
                  <li key={e.id} className={`flex items-center gap-3 px-5 py-3.5 ${e.is_active ? "" : "bg-slate-50"}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${e.is_active ? "bg-navy text-white" : "bg-slate-200 text-slate-500"}`}>{initials(e.full_name)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`truncate font-semibold ${e.is_active ? "text-ink" : "text-slate-500"}`}>{e.full_name}</span>
                        {e.role === "admin" && <span className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy"><ShieldCheck className="h-3 w-3" /> admin</span>}
                        {!e.is_active && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800">inactive</span>}
                        {me && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">you</span>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-600">
                        <span className="font-mono">{e.employee_id}</span> · {e.email ?? <span className="text-amber-700">no email</span>} · last sign-in {fmt(e.last_login_at)}
                      </div>
                    </div>
                    <ActionMenu items={items} label={`Manage ${e.full_name}`} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {modal?.kind === "email" && <EmailDialog emp={modal.emp} onClose={() => setModal(null)} toast={toast} guarded={guarded} />}
      {modal?.kind === "password" && <PasswordDialog emp={modal.emp} onClose={() => setModal(null)} toast={toast} guarded={guarded} />}
      {modal?.kind === "delete" && <DeleteDialog emp={modal.emp} onClose={() => setModal(null)} toast={toast} guarded={guarded}
        onDeactivateInstead={() => setModal({ kind: "deactivate", emp: modal.emp })} />}
      {modal?.kind === "deactivate" && <DeactivateDialog emp={modal.emp} onClose={() => setModal(null)} toast={toast} />}

      {verifyFor && (
        <StepUpDialog reason={verifyFor.reason} onClose={() => { verifyFor.cancel?.(); setVerifyFor(null); }}
          onVerified={(u) => { setUntil(u); const next = verifyFor.then; setVerifyFor(null); toast(true, "Verified — staff changes unlocked for 10 minutes"); next(); }} />
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[95] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-md border bg-white px-3.5 py-2.5 text-sm font-medium shadow-lg ${t.ok ? "border-emerald-200 text-emerald-900" : "border-rose-200 text-rose-800"}`}>
            {t.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indiagreen" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
            <span>{t.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="-mr-1 ml-1 text-slate-400 hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

type Guarded = (fn: () => Promise<AdminResult>, reason: string) => Promise<AdminResult>;
type ToastFn = (ok: boolean, text: string) => void;

/* ---------------- Add employee ---------------- */

function AddEmployee({ toast }: { toast: ToastFn }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0); // form.reset() doesn't reach the custom Select — remount instead
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onCreate = (fd: FormData) => {
    setMsg(null);
    start(async () => {
      const res = await createEmployee(fd);
      if (res.ok) {
        setMsg({ ok: true, text: `Employee created. Share the Employee ID and temporary password in person or by phone — never by email.` });
        toast(true, "Employee created");
        formRef.current?.reset(); setPwd(""); setFormKey((k) => k + 1);
      } else setMsg({ ok: false, text: res.error ?? "Failed" });
    });
  };

  return (
    <section className="glass self-start rounded-lg p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold text-ink"><UserPlus className="h-5 w-5 text-navy" /> Add employee</h1>
      <p className="mt-1 text-sm text-slate-600">Operators issue certificates. Admins can also edit records, manage staff and settings. Staff sign in with their Employee ID <i>or</i> email, using a password or a one-time email code.</p>
      <form ref={formRef} action={onCreate} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="employee_id">Employee ID</label>
            <input id="employee_id" name="employee_id" className="input uppercase tracking-wider" placeholder="NPK-0042" required pattern="[A-Za-z0-9-]{3,20}" />
          </div>
          <div>
            <label className="label" htmlFor="email">Login email</label>
            <input id="email" name="email" type="email" className="input" placeholder="name@example.com" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" className="input" placeholder="Rajesh Semwal" required minLength={2} maxLength={80} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="role">Role</label>
            <Select key={formKey} id="role" name="role" defaultValue="operator" options={[
              { value: "operator", label: "Operator", description: "Issues certificates, views records & stats" },
              { value: "admin", label: "Admin", description: "Full access: staff, settings, edits & deletes" },
            ]} />
          </div>
          <div>
            <label className="label" htmlFor="password">Temporary password</label>
            <div className="relative">
              <input id="password" name="password" type={show ? "text" : "password"} className="input pr-20 font-mono" required minLength={8} maxLength={72} autoComplete="new-password"
                value={pwd} onChange={(e) => setPwd(e.target.value)} />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-0.5">
                <button type="button" onClick={() => { setPwd(generatePassword()); setShow(true); }} title="Generate a strong password" aria-label="Generate a strong password" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy"><RefreshCw className="h-4 w-4" /></button>
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
          </div>
        </div>
        {msg && <p role="status" className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>}
        <button disabled={pending} className="btn-gold w-full rounded-md px-5 py-3 font-semibold disabled:opacity-60">{pending ? "Creating…" : "Create employee"}</button>
      </form>
    </section>
  );
}

/* ---------------- Step-up ---------------- */

function StepUpDialog({ reason, onClose, onVerified }: { reason: string; onClose: () => void; onVerified: (until: string) => void }) {
  const [sent, setSent] = useState<{ masked: string; sentAt: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [cooldown, setCooldown] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const send = () => start(async () => {
    setError("");
    const r = await requestStepUpCode();
    if (!r.ok) { setError(r.error); return; }
    setSent({ masked: r.masked, sentAt: r.sentAt }); setCooldown(60);
    setTimeout(() => input.current?.focus(), 50);
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { send(); }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    start(async () => {
      const r = await verifyStepUpCode(code);
      if (!r.ok) { setError(r.error); return; }
      onVerified(r.until ?? new Date(Date.now() + 10 * 60_000).toISOString());
    });
  };

  return (
    <Dialog open onClose={onClose} title="Confirm it's you" initialFocus={input}
      description={<>To {reason}, enter the code we emailed you. It unlocks staff changes for 10 minutes.</>}
      footer={<>
        <button type="button" disabled={cooldown > 0 || pending} onClick={send} className="mr-auto text-xs font-semibold text-navy hover:underline disabled:text-slate-400 disabled:no-underline">
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">Cancel</button>
        <button form="stepup" disabled={pending || !sent} className="btn-gold inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify
        </button>
      </>}>
      <form id="stepup" onSubmit={verify} className="space-y-3">
        {sent ? (
          <p className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> Code sent to <b>{sent.masked}</b> at <b>{sent.sentAt} IST</b>.
          </p>
        ) : !error && <p className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Sending a code to your email…</p>}
        <div>
          <label className="label" htmlFor="stepup-code">6-digit code</label>
          <input id="stepup-code" ref={input} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" value={code}
            onChange={(e) => { const v = e.target.value; const run = v.match(/(?<!\d)\d{6}(?!\d)/); setCode(run ? run[0] : v.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            className="input text-center text-2xl font-bold tracking-[0.5em]" />
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </form>
    </Dialog>
  );
}

/* ---------------- Change email ---------------- */

function EmailDialog({ emp, onClose, toast, guarded }: { emp: Employee; onClose: () => void; toast: ToastFn; guarded: Guarded }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const next = email.trim().toLowerCase();
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setError("Enter a valid email address."); return; }
    start(async () => {
      const r = await guarded(() => changeStaffEmail(emp.id, next), `change ${emp.full_name}'s login email`);
      if (!r.ok) { setError(r.error); return; }
      toast(true, r.message); onClose();
    });
  };
  return (
    <Dialog open onClose={onClose} title="Change login email" initialFocus={input}
      description={<>For <b>{emp.full_name}</b> (<span className="font-mono">{emp.employee_id}</span>). Their sign-in codes go to the new address immediately.</>}
      footer={<>
        <button type="button" onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">Cancel</button>
        <button form="staff-email" disabled={pending || !valid} className="btn-gold inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AtSign className="h-4 w-4" />} Change email
        </button>
      </>}>
      <form id="staff-email" onSubmit={submit} className="space-y-3">
        <div className="rounded-md bg-[#f4f6fa] px-3 py-2 text-sm text-slate-700">Current: <b className="text-ink">{emp.email ?? "not set"}</b></div>
        <div>
          <label className="label" htmlFor="staff-new-email">New login email</label>
          <input id="staff-new-email" ref={input} type="email" inputMode="email" className="input" placeholder="name@example.com" value={email} maxLength={120}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
        </div>
        <ul className="space-y-1 text-xs text-slate-600">
          <li className="flex gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0 text-navy" /> A security notice is sent to {emp.email ? "both the old and the new address" : "the new address"}.</li>
          <li className="flex gap-1.5"><KeyRound className="h-3.5 w-3.5 shrink-0 text-navy" /> Their password doesn&apos;t change.</li>
        </ul>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </form>
    </Dialog>
  );
}

/* ---------------- Reset password ---------------- */

function PasswordDialog({ emp, onClose, toast, guarded }: { emp: Employee; onClose: () => void; toast: ToastFn; guarded: Guarded }) {
  const [mode, setMode] = useState<"generate" | "manual">("generate");
  const [pwd, setPwd] = useState(() => generatePassword());
  const [show, setShow] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const passed = RULES.map(([, t]) => t(pwd));
  const ok = passed.every(Boolean);

  const submit = () => {
    if (!ok) { setError("The password doesn't meet the requirements yet."); return; }
    start(async () => {
      const r = await guarded(() => resetStaffPassword(emp.id, pwd), `reset ${emp.full_name}'s password`);
      if (!r.ok) { setError(r.error); return; }
      setDone(pwd); toast(true, r.message);
    });
  };
  const copy = async () => { try { await navigator.clipboard.writeText(done ?? pwd); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };

  if (done) {
    return (
      <Dialog open onClose={onClose} title="Password reset" description={<>Give this temporary password to <b>{emp.full_name}</b> in person or by phone. It won&apos;t be shown again.</>}
        footer={<button type="button" onClick={onClose} className="btn-gold rounded-md px-4 py-2 text-sm font-semibold">Done</button>}>
        <div className="flex items-center gap-2 rounded-md border border-line bg-[#f4f6fa] p-3">
          <code className="flex-1 select-all break-all text-lg font-bold tracking-wide text-ink">{done}</code>
          <button type="button" onClick={copy} className="btn-ghost inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold">
            {copied ? <Check className="h-3.5 w-3.5 text-indiagreen" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          <li className="flex gap-1.5"><ShieldAlert className="h-3.5 w-3.5 shrink-0 text-saffron" /> Never send passwords by email or WhatsApp.</li>
          <li className="flex gap-1.5"><UserCog className="h-3.5 w-3.5 shrink-0 text-navy" /> Ask them to change it from <b>My account</b> after signing in.</li>
          {emp.email && <li className="flex gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0 text-navy" /> They&apos;ve been emailed a notice that their password was reset (without the password).</li>}
        </ul>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} title="Reset password"
      description={<>For <b>{emp.full_name}</b> (<span className="font-mono">{emp.employee_id}</span>). Their current password stops working immediately.</>}
      footer={<>
        <button type="button" onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">Cancel</button>
        <button type="button" onClick={submit} disabled={pending || !ok} className="btn-gold inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Reset password
        </button>
      </>}>
      <div className="space-y-3">
        <div role="tablist" aria-label="Password method" className="grid grid-cols-2 rounded-md bg-[#f4f6fa] p-1 text-sm font-semibold">
          {(["generate", "manual"] as const).map((m) => (
            <button key={m} role="tab" type="button" aria-selected={mode === m}
              onClick={() => { setMode(m); setError(""); if (m === "generate") { setPwd(generatePassword()); setShow(true); } else { setPwd(""); setShow(false); } }}
              className={`rounded px-3 py-1.5 transition ${mode === m ? "bg-white text-navy shadow-sm" : "text-slate-600 hover:text-navy"}`}>
              {m === "generate" ? "Generate (recommended)" : "Type my own"}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="staff-pwd">Temporary password</label>
          <div className="relative">
            <input id="staff-pwd" type={show ? "text" : "password"} value={pwd} readOnly={mode === "generate"} maxLength={72} autoComplete="new-password"
              onChange={(e) => { setPwd(e.target.value); setError(""); }} className={`input pr-20 font-mono ${mode === "generate" ? "bg-[#f7f9fc]" : ""}`} />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-0.5">
              {mode === "generate" && <button type="button" onClick={() => setPwd(generatePassword())} title="Generate another" aria-label="Generate another" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy"><RefreshCw className="h-4 w-4" /></button>}
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {RULES.map(([label], i) => (
              <li key={label} className={`flex items-center gap-1 ${passed[i] ? "text-emerald-700" : "text-slate-500"}`}>{passed[i] ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />} {label}</li>
            ))}
          </ul>
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </div>
    </Dialog>
  );
}

/* ---------------- Remove / deactivate ---------------- */

function DeleteDialog({ emp, onClose, toast, guarded, onDeactivateInstead }: { emp: Employee; onClose: () => void; toast: ToastFn; guarded: Guarded; onDeactivateInstead: () => void }) {
  const [typed, setTyped] = useState("");
  const [records, setRecords] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { staffImpact(emp.id).then((r) => setRecords(r.records)).catch(() => setRecords(null)); }, [emp.id]);
  const match = typed.trim().toUpperCase() === emp.employee_id;
  const del = () => start(async () => {
    const r = await guarded(() => deleteStaff(emp.id, typed), `remove ${emp.full_name}`);
    if (!r.ok) { setError(r.error); return; }
    toast(true, r.message); onClose();
  });
  return (
    <Dialog open onClose={onClose} tone="danger" title={`Remove ${emp.full_name}?`} initialFocus={input}
      description={<>This permanently deletes the staff account <span className="font-mono">{emp.employee_id}</span>.</>}
      footer={<>
        {emp.is_active && <button type="button" onClick={onDeactivateInstead} className="mr-auto text-sm font-semibold text-navy hover:underline">Deactivate instead</button>}
        <button type="button" onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">Cancel</button>
        <button type="button" onClick={del} disabled={!match || pending} className="inline-flex items-center gap-2 rounded-md border border-rose-700 bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove permanently
        </button>
      </>}>
      <ul className="space-y-1.5 text-sm text-slate-700">
        <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> They can no longer sign in, by password or email code.</li>
        <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          {records === null ? "Checking their certificates…" : records === 0 ? "They haven't issued any certificates." : <>The <b>{records.toLocaleString("en-IN")}</b> certificate{records === 1 ? "" : "s"} they issued stay valid, but will no longer show their Employee ID.</>}
        </li>
        <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> This cannot be undone.</li>
      </ul>
      <p className="mt-3 rounded-md bg-[#eef3fb] px-3 py-2 text-xs text-slate-700"><b>Tip:</b> Deactivating blocks sign-in but keeps their history — and can be reversed.</p>
      <div className="mt-4">
        <label className="label" htmlFor="confirm-id">Type <span className="font-mono text-rose-700">{emp.employee_id}</span> to confirm</label>
        <input id="confirm-id" ref={input} className="input font-mono uppercase" value={typed} onChange={(e) => { setTyped(e.target.value); setError(""); }} autoComplete="off" spellCheck={false} />
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    </Dialog>
  );
}

function DeactivateDialog({ emp, onClose, toast }: { emp: Employee; onClose: () => void; toast: ToastFn }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  const go = () => start(async () => {
    const r = await setStaffActive(emp.id, false);
    if (!r.ok) { setError(r.error); return; }
    toast(true, r.message); onClose();
  });
  return (
    <Dialog open onClose={onClose} title={`Deactivate ${emp.full_name}?`} initialFocus={cancel}
      description={<>They&apos;re signed out on their next action and can&apos;t sign in until reactivated. Their records and history are kept.</>}
      footer={<>
        <button ref={cancel} type="button" onClick={onClose} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">Cancel</button>
        <button type="button" onClick={go} disabled={pending} className="inline-flex items-center gap-2 rounded-md border border-amber-600 bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />} Deactivate
        </button>
      </>}>
      {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : <p className="text-sm text-slate-600">You can reactivate them any time from this page.</p>}
    </Dialog>
  );
}

