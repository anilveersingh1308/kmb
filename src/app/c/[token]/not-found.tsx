import Link from "next/link";
import Ambient from "@/components/Ambient";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4">
      <Ambient intensity={0.5} />
      <div className="glass max-w-md rounded-3xl p-8 text-center animate-rise">
        <div className="text-5xl">🏔️</div>
        <h1 className="mt-4 font-devanagari text-2xl font-bold text-white">यह प्रमाण पत्र नहीं मिला</h1>
        <p className="mt-1 text-lg font-semibold text-slate-200">Certificate not found</p>
        <p className="mt-3 text-sm text-slate-400">
          The link may be incomplete or mistyped. Please open the exact link from your email, or ask the volunteer desk at the collection centre to resend it.
        </p>
        <Link href="/" className="btn-gold mt-6 inline-flex rounded-2xl px-5 py-3 font-semibold">Back to Carry Me Back</Link>
      </div>
    </main>
  );
}
