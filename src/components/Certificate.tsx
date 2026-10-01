"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { PublicCertificate } from "@/lib/types";

interface Props {
  data: PublicCertificate;
  verifyUrl: string;
  /** Scale-to-fit container (default) or render at natural 1123×794 px. */
  fit?: boolean;
  id?: string;
}

const BODY_1 =
  "को केदारनाथ धाम की पावन और संवेदनशील भूमि को स्वच्छ, प्लास्टिक मुक्त एवं पर्यावरण के अनुकूल बनाए रखने हेतु आयोजित 'कैरी मी बैक' (";
const BODY_2 =
  ") जन-जागरूकता एवं स्वच्छता पहल में एक निष्ठावान वॉलेंटियर के रूप में अपना अमूल्य एवं अनुकरणीय योगदान देने के लिए प्रदान किया जाता है। हिमालयी पारिस्थितिकी के संरक्षण और बाबा केदार के आंगन की गरिमा बनाए रखने के लिए आपका यह निःस्वार्थ सेवा भाव अत्यंत वंदनीय एवं प्रेरणास्पद है। नगर पंचायत केदारनाथ आपके इस उत्कृष्ट प्रयास की सराहना करता है तथा आपके सुखद एवं मंगलमय भविष्य की कामना करता है।";

export function sanitizeName(raw: string) {
  return raw.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function formatIssued(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Certificate({ data, verifyUrl, fit = true, id }: Props) {
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
    <div className="certificate" id={id} role="img" aria-label={`Certificate of Appreciation for ${name}`}
      style={fit ? { transform: `scale(${scale})` } : undefined}>
      <div className="cert-frame outer" />
      <div className="cert-frame mid" />
      <div className="cert-frame inner" />

      {/* Emblem */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/emblem.svg" alt="" width={86} height={95}
        style={{ position: "absolute", top: 78, left: "50%", transform: "translateX(-50%)" }} />

      <p className="cert-abs" style={{ top: 178, fontSize: 19, fontWeight: 700 }}>उत्तराखण्ड राज्य</p>
      <p className="cert-abs" style={{ top: 212, fontSize: 26, fontWeight: 700, color: "#7a1f1f" }}>
        कार्यालय नगर पंचायत केदारनाथ
      </p>
      <p className="cert-abs" style={{ top: 258, fontSize: 16, fontWeight: 700 }}>रुद्रप्रयाग (उत्तराखंड)</p>

      <div style={{ position: "absolute", top: 296, left: "50%", transform: "translateX(-50%)", width: 560, borderTop: "1px solid #c9a64b" }} />

      <p className="cert-abs" style={{ top: 306, fontSize: 38, fontWeight: 700, color: "#7a1f1f", lineHeight: 1.4 }}>प्रशस्ति पत्र</p>
      <p className="cert-abs" style={{ top: 372, fontSize: 14, letterSpacing: "0.32em", color: "#4a4a4a", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>
        CERTIFICATE OF APPRECIATION
      </p>
      <p className="cert-abs" style={{ top: 412, fontSize: 15, fontWeight: 700 }}>यह प्रमाण पत्र अत्यंत गौरव के साथ</p>

      {/* Name on dotted leader */}
      <div className="cert-dots" />
      <div ref={nameRef} className="cert-name" style={{ position: "absolute", top: 488 - nameSize - 3, left: "50%", transform: "translateX(-50%)", fontSize: nameSize, background: "#fff", padding: "0 18px", margin: 0 }}>
        {name}
      </div>

      <p className="cert-body">
        {BODY_1}<span className="latin">Carry Me Back</span>{BODY_2}
      </p>

      {/* Footer */}
      <p className="cert-abs" style={{ top: 704, fontSize: 18, fontWeight: 700, color: "#1e7b34" }}>
        स्वच्छ केदारनाथ सुंदर केदारनाथ
      </p>

      {/* Signature block — kept clear of the paragraph above */}
      <div style={{ position: "absolute", top: 632, left: 790, width: 210, textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/signature.png" alt="" width={108} height={88}
          style={{ display: "block", margin: "0 auto -16px", objectFit: "contain" }} />
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>अधिशासी अधिकारी</p>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>नगर पंचायत केदारनाथ</p>
      </div>

      {/* Micro footer: QR authenticity code + serial */}
      <div style={{ position: "absolute", left: 54, bottom: 50, display: "flex", alignItems: "center", gap: 8, color: "#8a8a8a", fontSize: 8.5, fontFamily: "var(--font-poppins)" }}>
        <div style={{ textAlign: "center" }}>
          <QRCodeSVG value={verifyUrl} size={52} level="M" fgColor="#3a3a3a" bgColor="#ffffff" />
          <div style={{ fontSize: 6.5, letterSpacing: "0.08em", color: "#6a6a6a", marginTop: 1, textTransform: "uppercase" }}>Scan to verify</div>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          <div>Serial: <b style={{ color: "#5a5a5a" }}>{data.serial_no}</b></div>
          <div>Issued: {formatIssued(data.issued_on)} · {data.bag_quantity} bag{data.bag_quantity > 1 ? "s" : ""} · {Number(data.waste_kg).toFixed(2)} kg</div>
          <div>Verify: {verifyUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}</div>
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
