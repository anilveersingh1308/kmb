import { createClient } from "@/lib/supabase/server";
import type { CampaignStats } from "@/lib/types";
import { Award, Package, Scale, Mail } from "lucide-react";

export default async function StatsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("campaign_stats");
  if (error || !data) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error?.message ?? "Could not load stats"}</p>;
  }
  const s = data as CampaignStats;

  // Fill the last 14 days so the chart has no gaps
  const days: { d: string; n: number }[] = [];
  const map = new Map(s.last14.map((x) => [x.d, Number(x.n)]));
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ d: key, n: map.get(key) ?? 0 });
  }
  const max = Math.max(1, ...days.map((x) => x.n));

  const cards = [
    { label: "Certificates", icon: Award, t: s.today.certificates, w: s.week.certificates, a: s.total.certificates },
    { label: "Bags carried", icon: Package, t: s.today.bags, w: s.week.bags, a: s.total.bags },
    { label: "Waste (kg)", icon: Scale, t: s.today.kg, w: s.week.kg, a: s.total.kg, kg: true },
  ];
  const fmt = (n: number, kg?: boolean) => (kg ? Number(n).toFixed(1) : Number(n).toLocaleString("en-IN"));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink sm:text-2xl">Campaign stats</h1>
        <p className="text-sm text-slate-600">Live numbers from the collection centre.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ label, icon: Icon, t, w, a, kg }) => (
          <div key={label} className="glass relative overflow-hidden rounded-lg p-6">
                        <div className="flex items-center gap-2 text-sm text-slate-700"><Icon className="h-4 w-4 text-navy" /> {label}</div>
            <div className="mt-3 text-4xl font-bold text-ink">{fmt(a, kg)}</div>
            <div className="mt-1 text-xs text-slate-600">all time</div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
              <div><div className="text-slate-600">Today</div><div className="font-semibold text-ink">{fmt(t, kg)}</div></div>
              <div><div className="text-slate-600">Last 7 days</div><div className="font-semibold text-ink">{fmt(w, kg)}</div></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="glass rounded-lg p-6">
          <h2 className="font-semibold text-ink">Certificates issued · last 14 days</h2>
          <svg viewBox="0 0 560 200" className="mt-4 w-full" role="img" aria-label="Bar chart of certificates issued per day">
            {days.map((x, i) => {
              const h = (x.n / max) * 150;
              const bx = 10 + i * 39;
              return (
                <g key={x.d}>
                  <rect x={bx} y={170 - h} width={28} height={h} rx={6} fill="url(#g)" opacity={x.n ? 1 : 0.25} />
                  <text x={bx + 14} y={165 - h} textAnchor="middle" fontSize="11" fill="#0b2f6b" fontWeight="600">{x.n || ""}</text>
                  <text x={bx + 14} y={190} textAnchor="middle" fontSize="10" fill="#4b5768">{x.d.slice(8)}</text>
                </g>
              );
            })}
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2f63c0" /><stop offset="1" stopColor="#0b2f6b" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="glass rounded-lg p-6">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><Mail className="h-4 w-4 text-navy" /> Email delivery</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Sent", s.emails.sent, "text-emerald-700"],
              ["Failed", s.emails.failed, "text-rose-700"],
              ["No email on record", s.emails.skipped, "text-amber-700"],
            ].map(([k, v, c]) => (
              <div key={k as string} className="flex items-center justify-between border-b border-line pb-3">
                <dt className="text-slate-700">{k as string}</dt>
                <dd className={`text-lg font-bold ${c as string}`}>{Number(v).toLocaleString("en-IN")}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">Failed emails can be retried from the Records tab.</p>
        </div>
      </div>
    </div>
  );
}
