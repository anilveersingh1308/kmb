"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AtSign, Check, CheckCircle2, Circle, Eye, EyeOff, KeyRound, Mail, RotateCcw, ShieldCheck, Timer, X } from "lucide-react";
import {
  confirmEmailChange, confirmPasswordChange, requestEmailChange, requestPasswordCode, resendNewEmailCode, verifyEmailIdentity,
} from "@/app/admin/account/actions";
import type { Employee } from "@/lib/types";

/** Pulls the 6-digit code out of whatever was typed or pasted ("Your code is 048213 …", "0 4 8 2 1 3"). */
function extractCode(raw: string) {
  const run = raw.match(/(?<!\d)\d{6}(?!\d)/);
  return run ? run[0] : raw.replace(/\D/g, "").slice(0, 6);
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
// Fixed to IST: the server renders in UTC, so an unpinned zone would mismatch the browser on hydration.

export default function AccountPanel({ employee }: { employee: Employee }) {
  const initials = employee.full_name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">My account</h1>
        <p className="text-sm text-slate-600">Your profile and sign-in details. Every change is confirmed with a one-time code sent to your email.</p>
      </div>

      <section className="glass flex flex-col gap-5 rounded-lg p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-xl font-bold text-white">{initials}</div>
        <dl className="grid flex-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Name" value={employee.full_name} />
          <Item label="Employee ID" value={<span className="font-mono">{employee.employee_id}</span>} />
          <Item label="Role" value={<span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${employee.role === "admin" ? "bg-navy/10 text-navy" : "bg-emerald-100 text-emerald-800"}`}>{employee.role === "admin" && <ShieldCheck className="h-3 w-3" />}{employee.role}</span>} />
          <Item label="Login email" value={employee.email ?? <span className="text-amber-700">Not set</span>} />
          <Item label="Last sign-in" value={fmt(employee.last_login_at)} />
          <Item label="Account created" value={fmt(employee.created_at)} />
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PasswordCard hasEmail={!!employee.email} />
        <EmailCard current={employee.email} />
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold text-ink">{value}</dd>
    </div>
  );
}

/* ---------------- Password ---------------- */

const RULES: [string, (p: string) => boolean][] = [
  ["At least 8 characters", (p) => p.length >= 8],
  ["A letter", (p) => /[A-Za-z]/.test(p)],
  ["A number", (p) => /\d/.test(p)],
  ["Upper & lower case (stronger)", (p) => /[a-z]/.test(p) && /[A-Z]/.test(p)],
  ["A symbol (stronger)", (p) => /[^A-Za-z0-9]/.test(p)],
];

function PasswordCard({ hasEmail }: { hasEmail: boolean }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<{ masked: string; sentAt: string } | null>(null);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const cooldown = useCooldown(sent?.sentAt);
  const codeRef = useRef<HTMLInputElement>(null);

  const passed = RULES.map(([, test]) => test(pw));
  const required = passed.slice(0, 3).every(Boolean);
  const score = passed.filter(Boolean).length;
  const strength = !pw ? "" : !required ? "Too weak" : score >= 5 ? "Strong" : score === 4 ? "Good" : "Fair";

  const send = () => start(async () => {
    setError("");
    const res = await requestPasswordCode();
    if (!res.ok) { setError(res.error); return; }
    setSent({ masked: res.masked, sentAt: res.sentAt });
    setTimeout(() => codeRef.current?.focus(), 50);
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    if (!required) { setError("Your new password doesn't meet the requirements yet."); return; }
    if (pw !== pw2) { setError("The two passwords don't match."); return; }
    start(async () => {
      setError("");
      const res = await confirmPasswordChange(code, pw, pw2);
      if (!res.ok) { setError(res.error); return; }
      setDone(res.message); setSent(null); setCode(""); setPw(""); setPw2("");
    });
  };

  return (
    <section className="glass rounded-lg">
      <CardHead icon={KeyRound} title="Change password" sub="Confirm with a code sent to your login email." />
      <div className="p-5 sm:p-6">
        <Steps steps={["Verify email", "New password"]} current={done ? 2 : sent ? 1 : 0} />
        {done ? (
          <Success text={done} onAgain={() => setDone("")} again="Change it again" />
        ) : !sent ? (
          <>
            <p className="mt-5 text-sm text-slate-700">We&apos;ll email a 6-digit code to your login address. It is valid for 10 minutes.</p>
            <ErrorBox error={error} />
            <button type="button" onClick={send} disabled={pending || !hasEmail} className="btn-gold mt-4 inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-semibold disabled:opacity-60">
              <Mail className="h-4 w-4" /> {pending ? "Sending…" : "Send verification code"}
            </button>
            {!hasEmail && <p className="mt-3 text-xs text-amber-700">Add a login email first (ask an administrator).</p>}
          </>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <SentNote masked={sent.masked} sentAt={sent.sentAt} />
            <CodeInput id="pw-code" inputRef={codeRef} value={code} onChange={setCode} />
            <div>
              <label className="label" htmlFor="pw-new">New password</label>
              <div className="relative">
                <input id="pw-new" type={show ? "text" : "password"} className="input pr-12" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" maxLength={72} aria-describedby="pw-rules" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-navy">
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {pw && (
                <div className="mt-2 flex items-center gap-2" aria-live="polite">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full ${i < (required ? score - 1 : 1) ? (strength === "Strong" ? "bg-indiagreen" : strength === "Good" ? "bg-emerald-500" : strength === "Fair" ? "bg-amber-500" : "bg-rose-500") : "bg-slate-200"}`} />
                    ))}
                  </div>
                  <span className="w-16 text-right text-xs font-semibold text-slate-600">{strength}</span>
                </div>
              )}
              <ul id="pw-rules" className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                {RULES.map(([label], i) => (
                  <li key={label} className={`flex items-center gap-1.5 ${passed[i] ? "text-emerald-700" : "text-slate-500"}`}>
                    {passed[i] ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />} {label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className="label" htmlFor="pw-confirm">Confirm new password</label>
              <input id="pw-confirm" type={show ? "text" : "password"} className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" maxLength={72} />
              {pw2 && pw !== pw2 && <p className="mt-1 text-xs text-rose-700">Passwords don&apos;t match.</p>}
            </div>
            <ErrorBox error={error} />
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={pending} className="btn-gold inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-semibold disabled:opacity-60">
                <KeyRound className="h-4 w-4" /> {pending ? "Saving…" : "Change password"}
              </button>
              <ResendLink cooldown={cooldown} pending={pending} onClick={send} />
              <button type="button" onClick={() => { setSent(null); setError(""); setCode(""); }} className="ml-auto text-xs text-slate-600 hover:text-navy">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

/* ---------------- Email ---------------- */

function EmailCard({ current }: { current: string | null }) {
  const [pending, start] = useTransition();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0 new address · 1 code from current · 2 code from new · 3 done
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ masked: string; sentAt: string } | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const cooldown = useCooldown(sent?.sentAt);
  const codeRef = useRef<HTMLInputElement>(null);
  const focusCode = () => setTimeout(() => codeRef.current?.focus(), 50);

  const begin = (e?: React.FormEvent) => {
    e?.preventDefault();
    start(async () => {
      setError("");
      const res = await requestEmailChange(email);
      if (!res.ok) { setError(res.error); return; }
      setSent({ masked: res.masked, sentAt: res.sentAt }); setCode("");
      setStep(res.skipIdentity ? 2 : 1); focusCode();
    });
  };
  const identity = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError("Enter the 6-digit code from your current email."); return; }
    start(async () => {
      setError("");
      const res = await verifyEmailIdentity(code);
      if (!res.ok) { setError(res.error); return; }
      setSent({ masked: res.masked, sentAt: res.sentAt }); setCode(""); setStep(2); focusCode();
    });
  };
  const finish = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError("Enter the 6-digit code sent to your new email."); return; }
    start(async () => {
      setError("");
      const res = await confirmEmailChange(email, code);
      if (!res.ok) { setError(res.error); return; }
      setDone(res.message); setStep(3);
    });
  };
  const resendNew = () => start(async () => {
    setError("");
    const res = await resendNewEmailCode(email);
    if (!res.ok) { setError(res.error); return; }
    setSent({ masked: res.masked, sentAt: res.sentAt });
  });
  const restart = () => { setStep(0); setSent(null); setCode(""); setError(""); setDone(""); };

  return (
    <section className="glass rounded-lg">
      <CardHead icon={AtSign} title="Change login email" sub="Sign-in codes are sent to this address." />
      <div className="p-5 sm:p-6">
        <Steps steps={current ? ["New address", "Confirm it's you", "Verify new email"] : ["New address", "Verify new email"]}
          current={current ? step : step === 0 ? 0 : step === 2 ? 1 : 2} />
        {step === 3 ? (
          <Success text={done} note={current ? "A security notice has been sent to your previous email address." : ""} />
        ) : step === 0 ? (
          <form onSubmit={begin} className="mt-5 space-y-4">
            <div className="rounded-md bg-[#f4f6fa] px-3 py-2 text-sm text-slate-700">Current: <b className="text-ink">{current ?? "not set"}</b></div>
            <div>
              <label className="label" htmlFor="new-email">New login email</label>
              <input id="new-email" type="email" inputMode="email" autoComplete="email" className="input" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={120} />
            </div>
            <ErrorBox error={error} />
            <button disabled={pending || !email} className="btn-gold inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-semibold disabled:opacity-60">
              <Mail className="h-4 w-4" /> {pending ? "Sending…" : current ? "Continue — send code to current email" : "Send code to new email"}
            </button>
            {current && <p className="text-xs text-slate-500">Two codes keep your account safe: one to your current inbox (proves it&apos;s you), then one to the new address (proves you own it).</p>}
          </form>
        ) : (
          <form onSubmit={step === 1 ? identity : finish} className="mt-5 space-y-4">
            {sent && <SentNote masked={sent.masked} sentAt={sent.sentAt} label={step === 1 ? "your current email" : "your new email"} />}
            <div className="rounded-md bg-[#f4f6fa] px-3 py-2 text-sm text-slate-700">Changing to <b className="text-ink">{email.trim().toLowerCase()}</b></div>
            <CodeInput id="email-code" inputRef={codeRef} value={code} onChange={setCode} />
            <ErrorBox error={error} />
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={pending} className="btn-gold inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-semibold disabled:opacity-60">
                <ShieldCheck className="h-4 w-4" /> {pending ? "Checking…" : step === 1 ? "Verify & send code to new email" : "Verify & change email"}
              </button>
              <ResendLink cooldown={cooldown} pending={pending} onClick={step === 1 ? () => begin() : resendNew} />
              <button type="button" onClick={restart} className="ml-auto text-xs text-slate-600 hover:text-navy">Start over</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

/* ---------------- shared bits ---------------- */

function useCooldown(sentAt?: string) {
  const [left, setLeft] = useState(0);
  useEffect(() => { if (sentAt) setLeft(60); }, [sentAt]);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return left;
}

function CardHead({ icon: I, title, sub }: { icon: typeof KeyRound; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3fb] text-navy"><I className="h-5 w-5" /></span>
      <div>
        <h2 className="font-bold text-ink">{title}</h2>
        <p className="text-xs text-slate-600">{sub}</p>
      </div>
    </div>
  );
}

function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "todo";
        return (
          <li key={s} className="flex min-w-0 flex-1 items-center gap-2" aria-current={state === "now" ? "step" : undefined}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${state === "done" ? "bg-indiagreen text-white" : state === "now" ? "bg-navy text-white" : "bg-slate-200 text-slate-600"}`}>
              {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`truncate text-xs font-semibold ${state === "todo" ? "text-slate-500" : "text-ink"}`}>{s}</span>
            {i < steps.length - 1 && <span className={`h-px flex-1 ${i < current ? "bg-indiagreen" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

function SentNote({ masked, sentAt, label }: { masked: string; sentAt: string; label?: string }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      <span>Code sent to {label ? <>{label} </> : null}<b>{masked}</b> at <b>{sentAt} IST</b>. It expires in 10 minutes.</span>
    </div>
  );
}

function CodeInput({ id, value, onChange, inputRef }: { id: string; value: string; onChange: (v: string) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div>
      <label className="label" htmlFor={id}>6-digit code</label>
      {/* No maxLength: it would truncate a pasted sentence before onChange can pick the code out of it. */}
      <input id={id} ref={inputRef} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" value={value}
        onChange={(e) => onChange(extractCode(e.target.value))}
        className="input text-center text-2xl font-bold tracking-[0.5em]" />
    </div>
  );
}

function ResendLink({ cooldown, pending, onClick }: { cooldown: number; pending: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={cooldown > 0 || pending} onClick={onClick} className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline disabled:text-slate-400 disabled:no-underline">
      {cooldown > 0 ? <><Timer className="h-3.5 w-3.5" /> Resend in {cooldown}s</> : <><RotateCcw className="h-3.5 w-3.5" /> Resend code</>}
    </button>
  );
}

function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return <p role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"><X className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>;
}

function Success({ text, note = "A confirmation has been emailed to you for your records.", onAgain, again }: { text: string; note?: string; onAgain?: () => void; again?: string }) {
  return (
    <div role="status" className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
      <p className="flex items-start gap-2 font-semibold text-emerald-900"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indiagreen" /> {text}</p>
      {note && <p className="mt-1 pl-7 text-xs text-emerald-800">{note}</p>}
      {onAgain && <button type="button" onClick={onAgain} className="mt-3 pl-7 text-xs font-semibold text-navy hover:underline">{again}</button>}
    </div>
  );
}

