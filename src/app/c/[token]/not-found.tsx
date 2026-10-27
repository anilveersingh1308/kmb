import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import GovHeader from "@/components/GovHeader";
import GovFooter from "@/components/GovFooter";
import { getLang } from "@/lib/lang-server";
import { HELPLINE } from "@/lib/site-text";

export default async function NotFound() {
  const lang = await getLang();
  return (
    <>
      <GovHeader lang={lang} active="verify" />
      <main id="main" className="mx-auto max-w-2xl px-4 py-16">
        <div role="alert" className="card overflow-hidden border-l-4 border-l-rose-600">
          <div className="flex items-start gap-4 p-6">
            <ShieldAlert className="h-10 w-10 shrink-0 text-rose-600" />
            <div>
              <h1 className="font-devanagari text-2xl font-bold text-ink">यह प्रमाण पत्र नहीं मिला</h1>
              <p className="mt-1 text-lg font-semibold text-slate-700">Certificate not found</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                This code does not match any certificate in the official register of Nagar Panchayat Kedarnath. The link may be incomplete or mistyped —
                please open the exact link from your email, or contact the collection booth to resend it.
              </p>
              <p className="mt-2 text-sm text-slate-600">Helpline: <a href={`tel:+91${HELPLINE}`} className="font-semibold text-navy hover:underline">{HELPLINE}</a></p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/#verify" className="btn-gold inline-flex rounded-md px-5 py-2.5 font-semibold">Try another code</Link>
                <Link href="/" className="btn-ghost inline-flex rounded-md px-5 py-2.5 font-semibold">Home</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <GovFooter lang={lang} />
    </>
  );
}
