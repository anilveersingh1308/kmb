"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Lock, LogIn, Eye, EyeOff, KeyRound, Mail, ArrowLeft, ShieldCheck, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Ambient from "@/components/Ambient";
import { requestLoginCode, verifyLoginCode } from "./actions";

type Mode = "password" | "otp";
const GENERIC = "Invalid ID / email or password.";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    params.get("reason") === "inactive" ? "Your account is inactive. Contact the administrator."
    : params.get("reason") === "link" ? "That sign-in link is invalid or has expired. Request a new code."
    : "",
  );

  // OTP state
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /** Employee ID or email → auth email (only for active employees). */
  const resolveEmail = async (): Promise<string | null> => {
    const id = identifier.trim();
    if (!id) return null;
    const { data } = await supabase.rpc("resolve_login_email", { p_identifier: id });
    if (typeof data === "string" && data) return data;
    // Legacy accounts created before employee emails existed
    if (/^[A-Za-z0-9-]{3,20}$/.test(id)) return `${id.toLowerCase()}@npk.local`;
    return null;
  };

  const finish = async (userId: string) => {
    const { data: emp } = await supabase.from("employees").select("is_active").eq("id", userId).maybeSingle();
    if (!emp || !emp.is_active) {
      await supabase.auth.signOut();
      setError("Your account is inactive. Contact the administrator.");
      setBusy(false);
      return;
    }
    await supabase.rpc("touch_last_login");
    const next = params.get("next");
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError(GENERIC); return; }
    setBusy(true);
    const email = await resolveEmail();
    if (!email) { setBusy(false); setError(GENERIC); return; }
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr || !data.user) { setBusy(false); setError(GENERIC); return; }
    await finish(data.user.id);
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    const res = await requestLoginCode(identifier);
    setBusy(false);
    if (!res.ok) { setError(res.error ?? "Could not send the code."); return; }
    setOtpEmail(res.masked ?? identifier);
    setCooldown(60);
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) { setError("Enter the 6-digit code from your email."); return; }
    setError("");
    setBusy(true);
    const res = await verifyLoginCode(identifier, token);
    if (!res.ok) { setBusy(false); setError(res.error ?? "Incorrect or expired code."); return; }
    const next = params.get("next");
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  const maskedEmail = otpEmail ?? "";

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <Ambient intensity={0.6} />
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 90, damping: 16 }}
        className="glass relative w-full max-w-md overflow-hidden rounded-3xl p-8">
        <div className="absolute -top-24 left-1/2 h-48 w-[130%] -translate-x-1/2 rounded-full bg-maroon/40 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emblem.svg" alt="" className="h-12 w-12" />
          <div className="leading-tight">
            <div className="font-devanagari text-sm font-bold">नगर पंचायत केदारनाथ</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Carry Me Back · Staff</div>
          </div>
        </Link>
        <h1 className="relative mt-6 flex items-center gap-2 text-2xl font-bold text-white"><Lock className="h-5 w-5 text-gold-light" /> Employee sign in</h1>
        <p className="relative mt-1 text-sm text-slate-400">Use your Employee ID or registered email.</p>

        {/* Mode switch */}
        <div className="relative mt-5 grid grid-cols-2 rounded-2xl bg-white/5 p-1 text-sm font-semibold">
          {(["password", "otp"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(""); setOtpEmail(null); setCode(""); }}
              className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 transition ${mode === m ? "text-[#2b1d05]" : "text-slate-300 hover:text-white"}`}>
              {mode === m && <motion.span layoutId="mode" className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold-light to-gold-dark" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
              <span className="relative flex items-center gap-2">{m === "password" ? <><KeyRound className="h-4 w-4" /> Password</> : <><Mail className="h-4 w-4" /> Email code</>}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {mode === "password" ? (
            <motion.form key="pwd" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}
              onSubmit={onPassword} className="relative mt-5 space-y-4" autoComplete="on">
              <IdentifierField value={identifier} onChange={setIdentifier} />
              <div>
                <label className="label" htmlFor="pwd">Password</label>
                <div className="relative">
                  <input id="pwd" type={show ? "text" : "password"} className="input pr-12" value={password} autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <ErrorBox error={error} />
              <button disabled={busy} className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-semibold disabled:opacity-60">
                <LogIn className="h-5 w-5" /> {busy ? "Signing in…" : "Sign in"}
              </button>
              <button type="button" onClick={() => setMode("otp")} className="w-full text-center text-xs text-slate-400 hover:text-white">Forgot password? Sign in with an email code instead</button>
            </motion.form>
          ) : !otpEmail ? (
            <motion.form key="otp-request" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}
              onSubmit={sendCode} className="relative mt-5 space-y-4">
              <IdentifierField value={identifier} onChange={setIdentifier} />
              <p className="text-xs text-slate-400">We&apos;ll email a 6-digit one-time code to the address registered for this account. It is valid for 10 minutes.</p>
              <ErrorBox error={error} />
              <button disabled={busy} className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-semibold disabled:opacity-60">
                <Mail className="h-5 w-5" /> {busy ? "Sending…" : "Send code"}
              </button>
            </motion.form>
          ) : (
            <motion.form key="otp-verify" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}
              onSubmit={verifyCode} className="relative mt-5 space-y-4">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                <ShieldCheck className="mr-1 inline h-4 w-4 text-emerald-300" /> Code sent to <b>{maskedEmail}</b>. It expires in 10 minutes.
              </div>
              <div>
                <label className="label" htmlFor="code">One-time code</label>
                <input id="code" ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                  className="input text-center text-2xl font-bold tracking-[0.5em]" placeholder="••••••"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} />
              </div>
              <ErrorBox error={error} />
              <button disabled={busy} className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-semibold disabled:opacity-60">
                <LogIn className="h-5 w-5" /> {busy ? "Verifying…" : "Verify & sign in"}
              </button>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <button type="button" onClick={() => { setOtpEmail(null); setCode(""); setError(""); }} className="inline-flex items-center gap-1 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Change account</button>
                <button type="button" disabled={cooldown > 0 || busy} onClick={() => sendCode()} className="inline-flex items-center gap-1 hover:text-white disabled:opacity-50">
                  <Timer className="h-3.5 w-3.5" /> {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="relative mt-6 text-center text-xs text-slate-500">Access is logged. Authorised Nagar Panchayat staff only.</p>
      </motion.div>
    </main>
  );
}

function IdentifierField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label" htmlFor="ident">Employee ID or email</label>
      <input id="ident" className="input" placeholder="NPK-0042  or  you@example.com" value={value} autoComplete="username" autoCapitalize="none" spellCheck={false}
        onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>;
}
