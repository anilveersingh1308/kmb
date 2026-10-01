"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, Share2, Sparkles, BadgeCheck, MessageCircle, Copy, Check, ShieldCheck } from "lucide-react";
import Certificate, { formatIssued, sanitizeName } from "./Certificate";
import Ambient from "./Ambient";
import { useCelebration } from "./celebration";
import { downloadCertificatePdf } from "@/lib/pdf";
import type { PublicCertificate } from "@/lib/types";
import { UI, type Lang } from "@/lib/i18n";
import LangToggle from "./LangToggle";

interface Props {
  data: PublicCertificate;
  url: string;
  /** URL encoded in the QR (same page + via=qr). */
  qrUrl: string;
  /** True when the page was opened by scanning the printed QR code. */
  viaQr?: boolean;
  verifiedAt: string;
  lang: Lang;
}

export default function CertificateView({ data, url, qrUrl, viaQr = false, verifiedAt, lang }: Props) {
  const t = UI[lang];
  const fire = useCelebration();
  const printRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const name = sanitizeName(data.full_name);

  useEffect(() => {
    const ready = "fonts" in document ? document.fonts.ready : Promise.resolve();
    const t = setTimeout(() => ready.then(() => { setRevealed(true); setTimeout(() => fire("grand"), 350); }), 900);
    return () => clearTimeout(t);
  }, [fire]);

  const onDownload = async () => {
    if (!printRef.current || busy) return;
    setBusy(true);
    try {
      await downloadCertificatePdf(printRef.current, `Carry-Me-Back-Certificate-${data.serial_no}${lang === "en" ? "-EN" : ""}`);
      fire("burst");
    } finally {
      setBusy(false);
    }
  };

  const shareText = `🙏 I carried my waste back from Kedarnath Dham and earned a Certificate of Appreciation from Nagar Panchayat Kedarnath! स्वच्छ केदारनाथ, सुंदर केदारनाथ 🏔️\n${url}`;
  const onShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "My Carry Me Back Certificate", text: shareText, url }); } catch { /* cancelled */ }
    } else {
      await onCopy();
    }
  };
  const onCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      <Ambient />

      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emblem.svg" alt="" className="h-10 w-10 drop-shadow-[0_0_12px_rgba(201,166,75,.5)]" />
          <div className="leading-tight">
            <div className="font-devanagari text-sm font-bold text-white">नगर पंचायत केदारनाथ</div>
            <div className="text-[11px] tracking-[0.2em] text-slate-300 uppercase">Carry Me Back</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle lang={lang} />
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <BadgeCheck className="h-4 w-4" /> <span className="hidden sm:inline">{t.verified}</span>
          </span>
        </div>
      </header>

      {/* QR authenticity banner */}
      {viaQr && (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="mx-auto mt-2 max-w-3xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 sm:p-5">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-pulse-ring" />
                <ShieldCheck className="relative h-8 w-8 text-emerald-300" />
              </div>
              <div>
                <p className="font-semibold text-emerald-200">{t.authentic}</p>
                <p className="mt-1 text-sm text-emerald-100/80">
                  QR code matched record <b className="font-mono text-white">{data.serial_no}</b> issued to <b className="text-white">{name}</b> by
                  Nagar Panchayat Kedarnath on {formatIssued(data.issued_on)}. Verified against the official register at {verifiedAt} IST.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hero congrats */}
      <section className="mx-auto max-w-6xl px-4 pt-6 text-center sm:px-6">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="font-devanagari text-base text-gold-light/90 sm:text-lg">
          {t.thanksLine}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 20, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
          <span className={`text-gold-shimmer ${lang === "hi" ? "font-devanagari" : ""}`}>{t.congrats}</span>
          <br />
          <span className="text-white">{name}</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
          className={`mx-auto mt-4 max-w-2xl text-slate-300 ${lang === "hi" ? "font-devanagari" : ""}`}>
          {t.carried(data.bag_quantity, Number(data.waste_kg).toFixed(2))}
        </motion.p>
      </section>

      {/* Certificate reveal */}
      <section className="mx-auto max-w-6xl px-2 pt-8 sm:px-6">
        <div className="relative mx-auto max-w-5xl">
          <AnimatePresence>
            {!revealed && (
              <motion.div key="loader" exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5 }}
                className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-gold/40 animate-pulse-ring" />
                  <div className="glass relative flex h-24 w-24 items-center justify-center rounded-full">
                    <Sparkles className="h-9 w-9 text-gold-light animate-spin-slow" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, rotateX: 18, scale: 0.85, y: 60 }}
            animate={revealed ? { opacity: 1, rotateX: 0, scale: 1, y: 0 } : {}}
            transition={{ type: "spring", stiffness: 70, damping: 16, mass: 1.1 }}
            style={{ transformPerspective: 1400 }}
            className="relative rounded-xl bg-white shadow-[0_40px_120px_-30px_rgba(201,166,75,.55),0_0_0_1px_rgba(201,166,75,.35)]">
            <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-[conic-gradient(from_0deg,#c9a64b,#f3e4a8,#7a1f1f,#c9a64b)] opacity-40 blur-2xl -z-10 animate-spin-slow" />
            <Certificate data={data} verifyUrl={qrUrl} lang={lang} />
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={revealed ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.4 }}
          className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={onDownload} disabled={busy}
            className="btn-gold flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold disabled:opacity-60">
            <Download className="h-5 w-5" /> {busy ? "…" : t.download}
          </button>
          <button onClick={() => window.print()} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold">
            <Printer className="h-5 w-5" /> {t.print}
          </button>
          <button onClick={onShare} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold">
            <Share2 className="h-5 w-5" /> {t.share}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
            className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-emerald-300">
            <MessageCircle className="h-5 w-5" /> WhatsApp
          </a>
        </motion.div>

        <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-sm text-slate-400">
          <button onClick={onCopy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/5">
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} {copied ? t.copied : t.copy}
          </button>
          <span className="opacity-40">•</span>
          <button onClick={() => fire("grand")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-white/5">
            <Sparkles className="h-4 w-4 text-gold-light" /> {t.again}
          </button>
        </div>

        {/* Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={revealed ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.6 }}
          className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t.serial, data.serial_no],
            [t.issued, formatIssued(data.issued_on)],
            [t.bags, String(data.bag_quantity)],
            [t.waste, `${Number(data.waste_kg).toFixed(2)} kg`],
          ].map(([k, v]) => (
            <div key={k} className="glass rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{k}</div>
              <div className="mt-1 truncate font-semibold text-white">{v}</div>
            </div>
          ))}
        </motion.div>

        {/* Authenticity panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={revealed ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.7 }}
          className="glass mx-auto mt-6 flex max-w-3xl flex-col items-center gap-4 rounded-3xl p-5 sm:flex-row sm:p-6">
          <div className="shrink-0 rounded-2xl bg-white p-2">
            <QR value={qrUrl} />
          </div>
          <div className="text-center sm:text-left">
            <p className="flex items-center justify-center gap-2 font-semibold text-white sm:justify-start"><ShieldCheck className="h-5 w-5 text-emerald-300" /> {t.uniqueQr}</p>
            <p className="mt-1 text-sm text-slate-300">
              Every certificate carries its own QR code. Anyone who scans it lands on this exact page, and the serial
              <b className="font-mono text-gold-light"> {data.serial_no}</b> is checked live against Nagar Panchayat Kedarnath&apos;s register.
              A certificate whose code does not resolve here is not genuine.
            </p>
            <p className="mt-2 text-xs text-slate-500">Machine-readable check: <span className="font-mono">{url.replace(/^https?:\/\//, "").replace("/c/", "/api/verify/")}</span></p>
          </div>
        </motion.div>

        <p className="mx-auto mt-10 max-w-2xl text-center font-devanagari text-lg font-bold text-emerald-400">
          {t.footerSlogan}
        </p>
        <p className="mx-auto mb-16 mt-2 max-w-xl text-center text-xs text-slate-500">
          {t.privacy}
        </p>
      </section>

      {/* Unscaled copy used for Print and PDF (kept off-screen) */}
      <div id="print-root" ref={printRef} aria-hidden
        style={{ position: "fixed", left: -20000, top: 0, width: 1123, height: 794, background: "#fff" }}>
        <Certificate data={data} verifyUrl={qrUrl} fit={false} id="print-cert" lang={lang} />
      </div>
    </main>
  );
}

function QR({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={112} level="M" fgColor="#1b1b1b" bgColor="#ffffff" />;
}
