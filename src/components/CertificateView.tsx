"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Printer, Share2, Sparkles, BadgeCheck, MessageCircle, Copy, Check, ShieldCheck, Loader2 } from "lucide-react";
import Certificate, { formatIssued, sanitizeName } from "./Certificate";
import GovHeader from "./GovHeader";
import GovFooter from "./GovFooter";
import { useCelebration } from "./celebration";
import { certificatePngFile, downloadCertificatePdf, printCertificate } from "@/lib/pdf";
import { shareMessage, shareTitle, whatsappUrl } from "@/lib/share-text";
import type { PublicCertificate } from "@/lib/types";
import { UI, type Lang } from "@/lib/i18n";

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
  const [action, setAction] = useState<"print" | "share" | null>(null);
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const [notice, setNotice] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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

  const fileBase = `Carry-Me-Back-Certificate-${data.serial_no}${lang === "en" ? "-EN" : ""}`;
  const message = shareMessage(lang, { bags: data.bag_quantity, kg: Number(data.waste_kg), url });
  const flash = (text: string) => { setNotice(text); setTimeout(() => setNotice(""), 3500); };

  /** One A4-landscape page, printed from an isolated frame holding only the certificate image (see printCertificate). */
  const onPrint = async () => {
    if (action || !printRef.current) return;
    setAction("print");
    try {
      await printCertificate(printRef.current, fileBase);
    } catch {
      window.print(); // fallback: the @media print stylesheet still isolates the certificate
    } finally {
      setAction(null);
    }
  };

  /** Phones: share the certificate image + message (WhatsApp, Telegram, Mail…). Elsewhere: message only, or copy it. */
  const onShare = async () => {
    if (action) return;
    setAction("share");
    try {
      if (navigator.share) {
        try {
          if (printRef.current && navigator.canShare?.({ files: [new File([""], "x.png", { type: "image/png" })] })) {
            const file = await certificatePngFile(printRef.current, fileBase);
            if (navigator.canShare({ files: [file] })) { await navigator.share({ title: shareTitle(lang), text: message, files: [file] }); return; }
          }
          await navigator.share({ title: shareTitle(lang), text: message });
        } catch (e) {
          if ((e as DOMException)?.name !== "AbortError") await copy("message"); // share sheet failed → fall back
        }
      } else {
        await copy("message");
      }
    } finally {
      setAction(null);
    }
  };

  const copy = async (what: "link" | "message") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? url : message);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
      if (what === "message") flash(lang === "hi" ? "संदेश कॉपी हो गया — इसे कहीं भी पेस्ट करें।" : "Message copied — paste it anywhere to share.");
    } catch {
      flash(lang === "hi" ? "कॉपी नहीं हो सका।" : "Couldn't copy to the clipboard.");
    }
  };

  const hi = lang === "hi" ? "font-devanagari" : "";

  return (
    <>
      <GovHeader lang={lang} active="verify" />
      <main id="main" className="relative overflow-x-hidden bg-[linear-gradient(180deg,#f4f6fa_0%,#ffffff_420px)]">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-4 text-xs text-slate-500 sm:px-6">
          <Link href="/" className="hover:text-navy hover:underline">{lang === "hi" ? "मुखपृष्ठ" : "Home"}</Link>
          <span className="mx-1.5">›</span>
          <span className={`text-slate-700 ${hi}`}>{t.verified}</span>
          <span className="mx-1.5">›</span>
          <span className="font-mono text-slate-700">{data.serial_no}</span>
        </nav>

        {/* QR authenticity banner */}
        {viaQr && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="mx-auto mt-4 max-w-4xl px-4 sm:px-6">
            <div role="status" className="flex items-start gap-3 rounded-md border border-[#9fd49a] border-l-4 border-l-indiagreen bg-[#eef8ee] p-4">
              <ShieldCheck className="mt-0.5 h-7 w-7 shrink-0 text-indiagreen" />
              <div>
                <p className="font-bold text-[#0e5a07]">{t.authentic}</p>
                <p className="mt-1 text-sm text-slate-700">
                  QR code matched record <b className="font-mono text-ink">{data.serial_no}</b> issued to <b className="text-ink">{name}</b> by
                  Nagar Panchayat Kedarnath on {formatIssued(data.issued_on)}. Verified against the official register at {verifiedAt} IST.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Heading */}
        <section className="mx-auto max-w-6xl px-4 pt-8 text-center sm:px-6">
          <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#9fd49a] bg-white px-3 py-1 text-xs font-semibold text-[#0e5a07] ${hi}`}>
            <BadgeCheck className="h-4 w-4 text-indiagreen" /> {t.verified}
          </span>
          <p className={`mt-4 text-base text-slate-600 ${hi}`}>{t.thanksLine}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-5xl">
            <span className={hi}>{t.congrats}</span> <span className="text-saffron">{name}</span>
          </h1>
          <p className={`mx-auto mt-3 max-w-2xl text-slate-700 ${hi}`}>
            {t.carried(data.bag_quantity, Number(data.waste_kg).toFixed(2))}
          </p>
        </section>

        {/* Certificate reveal */}
        <section className="mx-auto max-w-6xl px-2 pt-8 sm:px-6">
          <div className="relative mx-auto max-w-5xl">
            <AnimatePresence>
              {!revealed && (
                <motion.div key="loader" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
                  <div className={`flex flex-col items-center gap-3 text-sm font-medium text-navy ${hi}`}>
                    <span className="h-10 w-10 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
                    {lang === "hi" ? "प्रमाण पत्र तैयार हो रहा है…" : "Preparing certificate…"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 20 }}
              animate={revealed ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
              className="rounded-lg border border-line bg-[#f4f6fa] p-2 shadow-[0_24px_60px_-30px_rgba(11,47,107,.45)] sm:p-3">
              <div className="overflow-hidden rounded bg-white ring-1 ring-line">
                <Certificate data={data} verifyUrl={qrUrl} lang={lang} />
              </div>
            </motion.div>
          </div>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={revealed ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3 }}
            className={`mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 ${hi}`}>
            <button onClick={onDownload} disabled={busy}
              className="btn-gold flex min-h-12 items-center justify-center gap-2 rounded-md px-4 py-3 font-semibold disabled:opacity-60">
              <Download className="h-5 w-5" /> {busy ? "…" : t.download}
            </button>
            <button onClick={onPrint} disabled={action === "print"} title={lang === "hi" ? "एक A4 पृष्ठ पर प्रिंट करें" : "Print on one A4 landscape page"}
              className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-md px-4 py-3 font-semibold disabled:opacity-60">
              {action === "print" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Printer className="h-5 w-5" />} {t.print}
            </button>
            <button onClick={onShare} disabled={action === "share"} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-md px-4 py-3 font-semibold disabled:opacity-60">
              {action === "share" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />} {t.share}
            </button>
            <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-indiagreen bg-indiagreen px-4 py-3 font-semibold text-white transition hover:bg-[#0f6e06]">
              <MessageCircle className="h-5 w-5" /> WhatsApp
            </a>
          </motion.div>

          <div className={`mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-sm text-slate-600 ${hi}`}>
            <button onClick={() => copy("link")} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 hover:bg-[#eef3fb] hover:text-navy">
              {copied === "link" ? <Check className="h-4 w-4 text-indiagreen" /> : <Copy className="h-4 w-4" />} {copied === "link" ? t.copied : t.copy}
            </button>
            <span className="opacity-40">•</span>
            <button onClick={() => copy("message")} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 hover:bg-[#eef3fb] hover:text-navy">
              {copied === "message" ? <Check className="h-4 w-4 text-indiagreen" /> : <MessageCircle className="h-4 w-4" />} {lang === "hi" ? "संदेश कॉपी करें" : "Copy message"}
            </button>
            <span className="opacity-40">•</span>
            <button onClick={() => fire("grand")} className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 hover:bg-[#eef3fb] hover:text-navy">
              <Sparkles className="h-4 w-4 text-saffron" /> {t.again}
            </button>
          </div>

          {/* Details */}
          <div className="mx-auto mt-10 max-w-4xl">
            <div className="card overflow-hidden">
              <h2 className={`bg-navy px-5 py-3 text-base font-bold text-white ${hi}`}>{lang === "hi" ? "प्रमाण पत्र विवरण" : "Certificate details"}</h2>
              <dl className={`grid grid-cols-2 sm:grid-cols-4 ${hi}`}>
                {[
                  [t.serial, data.serial_no],
                  [t.issued, formatIssued(data.issued_on)],
                  [t.bags, String(data.bag_quantity)],
                  [t.waste, `${Number(data.waste_kg).toFixed(2)} kg`],
                ].map(([k, v], i) => (
                  <div key={k} className={`border-line p-4 ${i % 2 ? "border-l" : ""} ${i >= 2 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
                    <dd className="mt-1 truncate font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Authenticity panel */}
            <div className="card mt-6 flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6">
              <div className="shrink-0 rounded-md border border-line bg-white p-2">
                <QR value={qrUrl} />
              </div>
              <div className="text-center sm:text-left">
                <p className={`flex items-center justify-center gap-2 font-bold text-navy sm:justify-start ${hi}`}><ShieldCheck className="h-5 w-5 text-indiagreen" /> {t.uniqueQr}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  Every certificate carries its own QR code. Anyone who scans it lands on this exact page, and the serial
                  <b className="font-mono text-navy"> {data.serial_no}</b> is checked live against Nagar Panchayat Kedarnath&apos;s register.
                  A certificate whose code does not resolve here is not genuine.
                </p>
                <p className="mt-2 text-xs text-slate-500">Machine-readable check: <span className="break-all font-mono">{url.replace(/^https?:\/\//, "").replace("/c/", "/api/verify/")}</span></p>
              </div>
            </div>

            <p className={`mt-6 text-center text-xs text-slate-500 ${hi}`}>{t.privacy}</p>
          </div>
        </section>

        {notice && (
          <p role="status" className={`fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-md border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-lg ${hi}`}>{notice}</p>
        )}
      </main>
      {/* Unscaled copy used for Print, PDF and the share image. Portalled to <body> so @media print can hide every
          other body child with display:none — the page then has exactly one A4 sheet to print. */}
      {mounted && createPortal(
        <div id="print-root" ref={printRef} aria-hidden
          style={{ position: "fixed", left: -20000, top: 0, width: 1123, height: 794, background: "#fff" }}>
          <Certificate data={data} verifyUrl={qrUrl} fit={false} id="print-cert" lang={lang} />
        </div>,
        document.body,
      )}
      <GovFooter lang={lang} />
    </>
  );
}

function QR({ value }: { value: string }) {
  return <QRCodeSVG value={value} size={112} level="M" fgColor="#1b1b1b" bgColor="#ffffff" />;
}
