"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform, useInView } from "motion/react";
import { ArrowRight, Leaf, Mountain, Mail, ShieldCheck, Recycle, Award, QrCode, Lock } from "lucide-react";
import Ambient from "./Ambient";
import Certificate from "./Certificate";
import { useCelebration } from "./celebration";

const SAMPLE = { full_name: "Shree Vikram", bag_quantity: 1, waste_kg: 1, serial_no: "CMB-2026-000001", issued_on: new Date().toISOString().slice(0, 10) };

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{v.toLocaleString("en-IN")}{suffix}</span>;
}

export default function Landing({ counts }: { counts: { certificates: number; bags: number; kg: number } }) {
  const fire = useCelebration();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(() => fire("welcome"), 600);
    return () => clearTimeout(t);
  }, [fire]);

  // 3D tilt for the floating certificate
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 120, damping: 18 });
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const m = token.trim().match(/([A-Za-z0-9_-]{20,64})\s*$/);
    if (!m) { setErr("Paste the full certificate link or its code from your email."); return; }
    setErr("");
    router.push(`/c/${m[1]}`);
  };

  return (
    <main className="relative overflow-x-hidden">
      <Ambient />

      {/* NAV */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emblem.svg" alt="" className="h-11 w-11 drop-shadow-[0_0_14px_rgba(201,166,75,.55)]" />
          <div className="leading-tight">
            <div className="font-devanagari text-sm font-bold">नगर पंचायत केदारनाथ</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Carry Me Back</div>
          </div>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <a href="#how" className="hidden rounded-full px-3 py-2 text-slate-300 hover:text-white sm:inline">How it works</a>
          <a href="#verify" className="hidden rounded-full px-3 py-2 text-slate-300 hover:text-white sm:inline">Verify</a>
          <Link href="/admin/login" className="btn-ghost inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold">
            <Lock className="h-4 w-4" /> Staff
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
        <div>
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-gold-light">
            <Mountain className="h-4 w-4" /> Kedarnath Dham · 3,583 m · Rudraprayag, Uttarakhand
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, delay: 0.1 }}
            className="mt-5 text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
            <span className="text-gold-shimmer">Carry Me Back.</span>
            <br />
            <span className="font-devanagari text-white">कैरी मी बैक</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.9 }}
            className="mt-6 max-w-xl text-lg text-slate-300">
            Every pilgrim descending from Baba Kedar&apos;s abode carries one 1&nbsp;kg bag of dry waste down the trail. Deposit it at our collection centre and receive a personalised
            <b className="text-white"> Certificate of Appreciation (प्रशस्ति पत्र)</b> — instantly, by email, free.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-8 flex flex-wrap gap-3">
            <a href="#verify" className="btn-gold inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold">
              View my certificate <ArrowRight className="h-5 w-5" />
            </a>
            <a href="#how" className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold">How it works</a>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              [counts.bags, "bags carried back", ""],
              [counts.kg, "kg of waste removed", ""],
              [counts.certificates, "certificates issued", ""],
            ].map(([n, label]) => (
              <div key={label as string} className="glass rounded-2xl p-4">
                <div className="text-2xl font-bold text-white sm:text-3xl"><Counter to={Number(n)} /></div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">{label as string}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Floating 3D certificate preview */}
        <motion.div initial={{ opacity: 0, x: 60, rotateY: -20 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} transition={{ type: "spring", stiffness: 60, damping: 16, delay: 0.3 }}
          onMouseMove={onMove} onMouseLeave={() => { mx.set(0); my.set(0); }}
          style={{ perspective: 1400 }} className="relative mx-auto w-full max-w-xl">
          <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="animate-float">
            <div className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl bg-[conic-gradient(from_180deg,#c9a64b,#f3e4a8,#7a1f1f,#1e7b34,#c9a64b)] opacity-40 blur-2xl" />
            <div className="overflow-hidden rounded-xl bg-white shadow-[0_50px_120px_-30px_rgba(201,166,75,.6)]">
              <Certificate data={SAMPLE} verifyUrl="https://carrymeback.in/c/sample" />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,.35)_45%,transparent_60%)] bg-[length:250%_100%] animate-shimmer" />
          </motion.div>
          <div className="glass absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-slate-200">
            Your name goes here · <span className="text-gold-light">Personalised for every pilgrim</span>
          </div>
        </motion.div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [Recycle, "Tourism leaves a footprint", "Lakhs of pilgrims each season generate tonnes of dry waste at 3,500 m where there are no roads. It must come down on someone's back."],
            [Leaf, "Fragile Himalayan ecology", "Plastic in the Mandakini valley harms glaciers, wildlife and the water millions drink downstream."],
            [Award, "Recognition, not lectures", "One small act — carrying 1 kg down — earns a certificate from Nagar Panchayat Kedarnath you'll be proud to share."],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof Leaf;
            return (
              <motion.div key={title as string} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.1 }}
                className="glass group relative overflow-hidden rounded-3xl p-6">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/10 blur-2xl transition group-hover:bg-gold/25" />
                <I className="h-8 w-8 text-gold-light" />
                <h3 className="mt-4 text-lg font-bold text-white">{title as string}</h3>
                <p className="mt-2 text-sm text-slate-300">{body as string}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="font-devanagari text-gold-light">यह कैसे काम करता है</p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-5xl">Four steps. One cleaner mountain.</h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-4">
          {[
            ["01", Mountain, "Collect your bag at the top", "Volunteers near the temple hand descending pilgrims a sealed 1 kg bag of segregated dry waste with a unique bag number."],
            ["02", Recycle, "Carry it down the trail", "16 km of sacred path. Your bag rides with you — a small weight, a big statement."],
            ["03", QrCode, "Deposit at the collection centre", "Our team scans the bag, records your name, phone and email in seconds."],
            ["04", Mail, "Receive your certificate", "An email with a private link opens your personalised प्रशस्ति पत्र — download, print or share it instantly."],
          ].map(([n, Icon, title, body], i) => {
            const I = Icon as typeof Leaf;
            return (
              <motion.li key={n as string} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.12 }}
                className="glass relative rounded-3xl p-6">
                <div className="absolute right-5 top-4 text-5xl font-bold text-white/5">{n as string}</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-light to-gold-dark text-[#2b1d05]">
                  <I className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-bold text-white">{title as string}</h3>
                <p className="mt-2 text-sm text-slate-300">{body as string}</p>
              </motion.li>
            );
          })}
        </ol>
      </section>

      {/* VERIFY */}
      <section id="verify" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="glass relative overflow-hidden rounded-3xl p-8 text-center">
          <div className="absolute -top-20 left-1/2 h-40 w-[120%] -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" />
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400" />
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Open or verify a certificate</h2>
          <p className="mt-2 text-sm text-slate-300">Paste the link from your email (or the code at the end of it). No login, no app.</p>
          <form onSubmit={onVerify} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input value={token} onChange={(e) => setToken(e.target.value)} className="input flex-1" placeholder="https://…/c/AbC123…  or  AbC123…" aria-label="Certificate link or code" />
            <button className="btn-gold rounded-2xl px-6 py-3 font-semibold">Open</button>
          </form>
          {err && <p className="mt-3 text-sm text-rose-300">{err}</p>}
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 text-center sm:px-6">
        <p className="font-devanagari text-xl font-bold text-emerald-400">स्वच्छ केदारनाथ · सुंदर केदारनाथ</p>
        <p className="mt-2 text-xs text-slate-500">
          © {new Date().getFullYear()} कार्यालय नगर पंचायत केदारनाथ, रुद्रप्रयाग (उत्तराखंड) · Carry Me Back is a zero-cost citizen initiative.
        </p>
      </footer>
    </main>
  );
}
