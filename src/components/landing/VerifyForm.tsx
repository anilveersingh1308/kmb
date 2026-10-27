"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

interface Props {
  title: string;
  placeholder: string;
  button: string;
  error: string;
}

export default function VerifyForm({ title, placeholder, button, error }: Props) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = token.trim().match(/([A-Za-z0-9_-]{20,64})\s*$/);
    if (!m) { setErr(error); return; }
    setErr("");
    router.push(`/c/${m[1]}`);
  };

  return (
    <>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="verify-token" className="sr-only">{title}</label>
        <input id="verify-token" value={token} onChange={(e) => setToken(e.target.value)} className="input flex-1 font-sans" placeholder={placeholder}
          aria-invalid={!!err} aria-describedby={err ? "verify-err" : "verify-hint"} />
        <button className="btn-gold inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 font-semibold">
          <ShieldCheck className="h-5 w-5" /> {button}
        </button>
      </form>
      {err && <p id="verify-err" role="alert" className="mt-3 text-sm font-medium text-rose-700">{err}</p>}
    </>
  );
}
