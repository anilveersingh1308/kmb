import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchPublicCertificate } from "@/lib/certificates";

// Link-preview card for WhatsApp / Facebook / X / Telegram (they don't render SVG previews).
// Latin text only: the default ImageResponse font has no Devanagari glyphs. (Satori borders: solid or dashed only.)
export const alt = "Certificate of Appreciation — Carry Me Back, Nagar Panchayat Kedarnath";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [cert, logo] = await Promise.all([
    fetchPublicCertificate(token),
    readFile(join(process.cwd(), "public", "uttarakhand-logo.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;
  const name = cert?.full_name ?? "A proud pilgrim";
  const kg = cert ? Number(cert.waste_kg).toFixed(cert.waste_kg % 1 ? 2 : 0) : null;
  const nameSize = name.length > 34 ? 46 : name.length > 24 ? 56 : 68;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fdf9ef", padding: 22 }}>
        <div style={{ flex: 1, display: "flex", border: "8px solid #c9a64b", padding: 6 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px solid #c9a64b", padding: "28px 60px", textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={92} height={93} alt="" />
            <div style={{ marginTop: 10, fontSize: 18, letterSpacing: 6, color: "#3a3a3a", fontWeight: 600 }}>NAGAR PANCHAYAT KEDARNATH · UTTARAKHAND</div>
            <div style={{ marginTop: 18, fontSize: 54, fontWeight: 700, color: "#1d1d1d" }}>Certificate of Appreciation</div>
            <div style={{ marginTop: 14, fontSize: 24, color: "#555", fontStyle: "italic" }}>presented to</div>
            <div style={{ marginTop: 6, fontSize: nameSize, fontWeight: 700, color: "#0b2f6b", borderBottom: "3px dashed #c9a64b", paddingBottom: 6, maxWidth: 1000 }}>{name}</div>
            <div style={{ marginTop: 22, fontSize: 26, color: "#333" }}>
              {kg ? `for carrying ${kg} kg of waste back from Kedarnath Dham` : "for keeping Kedarnath Dham clean"}
            </div>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14, fontSize: 22, fontWeight: 700 }}>
              <span style={{ color: "#f47c20" }}>Carry Me Back</span>
              <span style={{ color: "#999" }}>·</span>
              <span style={{ color: "#138808" }}>Clean Kedarnath, Beautiful Kedarnath</span>
              {/* Drawn as SVG: the default font has no "✓" glyph */}
              {cert && <><span style={{ color: "#999" }}>·</span><span style={{ display: "flex", alignItems: "center", gap: 6, color: "#0b2f6b" }}>
                <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#138808" /><path d="M6.5 12.5l3.5 3.5 7.5-8" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Verified
              </span></>}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
