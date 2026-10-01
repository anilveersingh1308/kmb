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
    openGraph: {
      title: `🙏 ${cert.full_name} – Carry Me Back Certificate`,
      description: "Verified Certificate of Appreciation · Nagar Panchayat Kedarnath",
      images: [{ url: "/og.svg", width: 1200, height: 630 }],
    },
  };
}

export default async function CertificatePage({ params, searchParams }: Params) {
  const [{ token }, { via, lang: langParam }] = await Promise.all([params, searchParams]);
  const [cert, lang] = await Promise.all([fetchPublicCertificate(token), getLang(langParam)]);
  if (!cert) notFound();
  return <CertificateView data={cert} url={certificateUrl(token)} qrUrl={qrVerifyUrl(token)} viaQr={via === "qr"} verifiedAt={istNow()} lang={lang} />;
}
