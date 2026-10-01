import Link from "next/link";
import Ambient from "@/components/Ambient";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4">
      <Ambient intensity={0.5} />
      <div className="glass max-w-md rounded-3xl p-8 text-center animate-rise">
        <div className="text-6xl font-bold text-gold-shimmer">404</div>
        <p className="mt-3 text-lg font-semibold text-white">This trail doesn&apos;t exist.</p>
        <Link href="/" className="btn-gold mt-6 inline-flex rounded-2xl px-5 py-3 font-semibold">Back to Carry Me Back</Link>
      </div>
    </main>
  );
}
