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
  const [nameSize, setNameSize] = useState(38);
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

  // Shrink long names (min 18px) so they stay on the 620px leader and never wrap.
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    let size = 38;
    el.style.fontSize = `${size}px`;
    const fitName = () => {
      while (el.scrollWidth > 600 && size > 18) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
      setNameSize(size);
    };
    if ("fonts" in document) document.fonts.ready.then(fitName);
    else fitName();
  }, [name]);

  const bags = t.bagWord(data.bag_quantity);
  const kg = `${Number(data.waste_kg).toFixed(2)} kg`;

  const certificate = (
    <div className={`certificate cert-${lang}`} id={id} role="img" aria-label={t.ariaLabel(name)} lang={lang}
      style={fit ? { transform: `scale(${scale})` } : undefined}>
      {/* Frame: hairline · thick gold band · hairline, plus ornamental corners */}
      <div className="cert-frame outer" />
      {(["t", "r", "b", "l"] as const).map((e) => <div key={e} className={`cert-band ${e}`} />)}
      <div className="cert-frame inner" />
      {(["tl", "tr", "bl", "br"] as const).map((c) => <span key={c} className={`cert-corner ${c}`}><i /></span>)}

      {/* Watermark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/uttarakhand-logo.png" alt="" className="cert-watermark" />

      {/* Header */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/uttarakhand-logo.png" alt="" width={70} height={71} style={{ position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)" }} />
      <p className="cert-abs cert-state">{t.state}</p>
      <p className="cert-abs cert-office">{t.office}</p>
      <p className="cert-abs cert-district">{t.district}</p>
      <div className="cert-divider"><i /></div>

      <p className="cert-abs cert-title">{t.title}</p>
      {!en && <p className="cert-abs cert-subtitle">{t.subtitle}</p>}
      <p className="cert-abs cert-presented">{t.presented}</p>

      {/* Name on dotted leader */}
      <div ref={nameRef} className="cert-name" style={{ top: (en ? 374 : 388) - nameSize * 1.12, fontSize: nameSize }}>{name}</div>
      <div className="cert-dots" />
      <p className="cert-abs cert-name-label">{t.nameLabel}</p>

      <p className="cert-body">
        {t.body1}<span className="latin">{t.bodyLatin}</span>{t.body2}
      </p>

      {/* Bottom-left: verification QR + issue details */}
      <div className="cert-meta">
        <div style={{ textAlign: "center" }}>
          <QRCodeSVG value={verifyUrl} size={58} level="M" fgColor="#2b2b2b" bgColor="#fffdf7" />
          <div className="cert-meta-scan">Scan to verify</div>
        </div>
        <div className="cert-meta-rule" />
        <div className="cert-meta-text">
          <div>{t.issuedLabel}: <b>{formatIssued(data.issued_on)}</b></div>
          <div>{t.collectedLabel}: <b>{bags} · {kg}</b></div>
          <div>{t.serialLabel}: <b style={{ fontFamily: "ui-monospace, monospace" }}>{data.serial_no}</b></div>
        </div>
      </div>

      {/* Signatories */}
      <div className="cert-sign" style={{ left: 392 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/signature.png" alt="" className="cert-sign-img" style={{ height: 62, marginBottom: -6 }} />
        <div className="cert-sign-line" />
        <p className="cert-sign-title">{t.signatory}</p>
        <p>{t.signatoryOrg}</p>
        <p>{t.signatoryPlace}</p>
      </div>
      <div className="cert-sign" style={{ left: 742 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/signature-sdm.png" alt="" className="cert-sign-img" style={{ height: 56 }} />
        <div className="cert-sign-line" />
        <p className="cert-sign-title">{t.officer2Title}</p>
        <p>{t.officer2Org}</p>
        <p className="cert-sign-role">{t.officer2Role}</p>
        <p>{t.officer2Place}</p>
      </div>

      {/* Footer */}
      <p className="cert-abs cert-slogan">{t.slogan}</p>
      <p className="cert-abs cert-collab">{t.collaboration}</p>
    </div>
  );

  if (!fit) return certificate;
  return (
    <div ref={stageRef} className="cert-stage">
      {certificate}
    </div>
  );
}
