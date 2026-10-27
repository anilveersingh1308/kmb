"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { PublicCertificate } from "@/lib/types";
import { CERT_TEXT, type Lang } from "@/lib/i18n";

interface Props {
  data: PublicCertificate;
  verifyUrl: string;
  /** Scale-to-fit container (default) or render at natural 1123×794 px. */
  fit?: boolean;
  id?: string;
  lang?: Lang;
}

export function sanitizeName(raw: string) {
  return raw.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function formatIssued(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Certificate({ data, verifyUrl, fit = true, id, lang = "hi" }: Props) {
  const t = CERT_TEXT[lang];
  const en = lang === "en";
  const stageRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [nameSize, setNameSize] = useState(32);
  const name = sanitizeName(data.full_name);

  // Scale the fixed 1123px canvas to the container width.
  useLayoutEffect(() => {
    if (!fit) return;
    const el = stageRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1123);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // Shrink long names (min 22px) so they never wrap.
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    let size = 32;
    el.style.fontSize = `${size}px`;
    const fitName = () => {
      while (el.scrollWidth > 540 && size > 20) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      setNameSize(size);
    };
    if ("fonts" in document) document.fonts.ready.then(fitName);
    else fitName();
  }, [name]);

  const certificate = (
    <div className={`certificate cert-${lang}`} id={id} role="img" aria-label={t.ariaLabel(name)} lang={lang}
      style={fit ? { transform: `scale(${scale})` } : undefined}>
      <div className="cert-frame outer" />
      <div className="cert-frame mid" />
      <div className="cert-frame inner" />

      {/* Emblem */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/emblem.svg" alt="" width={86} height={95}
        style={{ position: "absolute", top: 78, left: "50%", transform: "translateX(-50%)" }} />

      <p className="cert-abs" style={{ top: 178, fontSize: en ? 15 : 19, fontWeight: 700, letterSpacing: en ? "0.18em" : 0, textTransform: en ? "uppercase" : "none" }}>{t.state}</p>
      <p className="cert-abs" style={{ top: en ? 206 : 212, fontSize: en ? 24 : 26, fontWeight: 700, color: "#7a1f1f", fontFamily: en ? "var(--font-serif-bold)" : undefined }}>
        {t.office}
      </p>
      <p className="cert-abs" style={{ top: en ? 254 : 258, fontSize: en ? 14 : 16, fontWeight: en ? 600 : 700, letterSpacing: en ? "0.06em" : 0 }}>{t.district}</p>

      <div style={{ position: "absolute", top: 296, left: "50%", transform: "translateX(-50%)", width: 560, borderTop: "1px solid #c9a64b" }} />

      {en ? (
        <>
          <p className="cert-abs" style={{ top: 330, fontSize: 36, fontWeight: 700, color: "#7a1f1f", lineHeight: 1.4, fontFamily: "var(--font-serif-bold)", letterSpacing: "0.02em" }}>{t.title}</p>
          <p className="cert-abs" style={{ top: 396, fontSize: 14, fontStyle: "italic", color: "#333", fontFamily: "var(--font-serif)" }}>{t.presented}</p>
        </>
      ) : (
        <>
          <p className="cert-abs" style={{ top: 306, fontSize: 38, fontWeight: 700, color: "#7a1f1f", lineHeight: 1.4 }}>{t.title}</p>
          <p className="cert-abs" style={{ top: 372, fontSize: 14, letterSpacing: "0.32em", color: "#4a4a4a", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>{t.subtitle}</p>
          <p className="cert-abs" style={{ top: 412, fontSize: 15, fontWeight: 700 }}>{t.presented}</p>
        </>
      )}

      {/* Name on dotted leader */}
      <div className="cert-dots" />
      <div ref={nameRef} className="cert-name" style={{ position: "absolute", top: 488 - nameSize - 3, left: "50%", transform: "translateX(-50%)", fontSize: nameSize, background: "#fff", padding: "0 18px", margin: 0 }}>
        {name}
      </div>

      <p className="cert-body">
        {t.body1}<span className="latin">{t.bodyLatin}</span>{t.body2}
      </p>

      {/* Footer */}
      <p className="cert-abs" style={{ top: en ? 700 : 696, fontSize: en ? 16 : 18, fontWeight: 700, color: "#1e7b34", letterSpacing: en ? "0.04em" : 0 }}>
        {t.slogan}
      </p>

      {/* Signature block — kept clear of the paragraph above */}
      <div style={{ position: "absolute", top: 626, left: 790, width: 210, textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/signature.png" alt="" width={108} height={88}
          style={{ display: "block", margin: "0 auto -16px", objectFit: "contain" }} />
        <p style={{ margin: 0, fontSize: en ? 14 : 15, fontWeight: 700 }}>{t.signatory}</p>
        <p style={{ margin: 0, fontSize: en ? 12.5 : 13.5, fontWeight: en ? 600 : 700 }}>{t.signatoryOrg}</p>
      </div>

      {/* Collaboration line */}
      <p className="cert-abs" style={{ top: 733, fontSize: 10.5, fontStyle: "italic", color: "#6a6a6a", fontFamily: "var(--font-serif)", letterSpacing: "0.02em" }}>
        {t.collaboration}
      </p>

      {/* Micro footer: QR authenticity code + serial */}
      <div style={{ position: "absolute", left: 54, bottom: 50, display: "flex", alignItems: "center", gap: 8, color: "#8a8a8a", fontSize: 8.5, fontFamily: "var(--font-poppins)", maxWidth: 290 }}>
        <div style={{ textAlign: "center" }}>
          <QRCodeSVG value={verifyUrl} size={52} level="M" fgColor="#3a3a3a" bgColor="#ffffff" />
          <div style={{ fontSize: 6.5, letterSpacing: "0.08em", color: "#6a6a6a", marginTop: 1, textTransform: "uppercase" }}>Scan to verify</div>
        </div>
        <div style={{ lineHeight: 1.5, minWidth: 0 }}>
          <div>Serial: <b style={{ color: "#5a5a5a" }}>{data.serial_no}</b></div>
          <div>Issued: {formatIssued(data.issued_on)} · {data.bag_quantity} bag{data.bag_quantity > 1 ? "s" : ""} · {Number(data.waste_kg).toFixed(2)} kg</div>
          <div style={{ overflowWrap: "anywhere", wordBreak: "break-all" }}>Verify: {verifyUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}</div>
        </div>
      </div>
    </div>
  );

  if (!fit) return certificate;
  return (
    <div ref={stageRef} className="cert-stage">
      {certificate}
    </div>
  );
}
