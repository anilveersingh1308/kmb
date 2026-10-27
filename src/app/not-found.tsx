import Link from "next/link";
import GovHeader from "@/components/GovHeader";
import GovFooter from "@/components/GovFooter";
import { getLang } from "@/lib/lang-server";

export default async function NotFound() {
  const lang = await getLang();
  return (
    <>
      <GovHeader lang={lang} />
      <main id="main" className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <div className="text-7xl font-bold text-navy">404</div>
        <h1 className="mt-3 font-devanagari text-2xl font-bold text-ink">पृष्ठ उपलब्ध नहीं है</h1>
        <p className="mt-1 text-lg font-semibold text-slate-700">Page not found</p>
        <p className="mt-3 text-sm text-slate-600">The page you are looking for may have been moved or does not exist.</p>
        <Link href="/" className="btn-gold mt-6 inline-flex rounded-md px-5 py-3 font-semibold">मुखपृष्ठ पर जाएं · Go to Home</Link>
      </main>
      <GovFooter lang={lang} />
    </>
  );
}
