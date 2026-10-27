import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CertificateView from "@/components/CertificateView";
import { fetchPublicCertificate } from "@/lib/certificates";
import { certificateUrl, qrVerifyUrl } from "@/lib/types";
import { getLang } from "@/lib/lang-server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }>; searchParams: Promise<{ via?: string; lang?: string }> };

function istNow() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const cert = await fetchPublicCertificate(token);
  if (!cert) return { title: "Certificate not found", robots: { index: false } };
  return {
    title: `Certificate of Appreciation – ${cert.full_name}`,
    description: `${cert.full_name} carried ${cert.waste_kg} kg of waste back from Kedarnath Dham. Verified by Nagar Panchayat Kedarnath.`,
    robots: { index: false, follow: false },
    // The preview image comes from ./opengraph-image.tsx (a PNG card with the participant's name).
    openGraph: {
      type: "website",
      title: `${cert.full_name} — Certificate of Appreciation`,
      description: `Carried ${Number(cert.waste_kg).toFixed(2)} kg of waste back from Kedarnath Dham · Carry Me Back, Nagar Panchayat Kedarnath · Tap to view & verify.`,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CertificatePage({ params, searchParams }: Params) {
  const [{ token }, { via, lang: langParam }] = await Promise.all([params, searchParams]);
  const [cert, lang] = await Promise.all([fetchPublicCertificate(token), getLang(langParam, "en")]);
  if (!cert) notFound();
  return <CertificateView data={cert} url={certificateUrl(token)} qrUrl={qrVerifyUrl(token)} viaQr={via === "qr"} verifiedAt={istNow()} lang={lang} />;
}
