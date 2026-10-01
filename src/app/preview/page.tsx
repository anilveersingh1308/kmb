import { notFound } from "next/navigation";
import CertificateView from "@/components/CertificateView";
import { certificateUrl, qrVerifyUrl } from "@/lib/types";
import { getLang } from "@/lib/lang-server";

/** Design preview with sample data. Available in development or when ALLOW_PREVIEW=1. */
export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ name?: string; via?: string; lang?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PREVIEW !== "1") notFound();
  const { name, via, lang: langParam } = await searchParams;
  const lang = await getLang(langParam);
  const data = {
    full_name: name?.slice(0, 80) || "Shree Vikram",
    bag_quantity: 1,
    waste_kg: 1,
    serial_no: "CMB-2026-000001",
    issued_on: new Date().toISOString().slice(0, 10),
  };
  const token = "PREVIEW-sample-token-000000";
  const verifiedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return <CertificateView data={data} url={certificateUrl(token)} qrUrl={qrVerifyUrl(token)} viaQr={via === "qr"} verifiedAt={verifiedAt} lang={lang} />;
}
