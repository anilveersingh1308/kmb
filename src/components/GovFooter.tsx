import Link from "next/link";
import Image from "next/image";
import { Phone, MapPin, Recycle } from "lucide-react";
import { SITE, HELPLINE } from "@/lib/site-text";
import type { Lang } from "@/lib/i18n";

/** Build date stands in for "last updated" — the site content changes only on deploy. */
const UPDATED = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default function GovFooter({ lang }: { lang: Lang }) {
  const t = SITE[lang];
  const hi = lang === "hi" ? "font-devanagari" : "";
  const quick: [string, string][] = [
    [t.nav.about, "/#about"], [t.nav.how, "/#how"], [t.nav.verify, "/#verify"], [t.nav.gallery, "/#gallery"], [t.nav.staff, "/admin/login"],
  ];
  const policies: [string, string][] = [
    [t.policyLinks.privacy, "/policies#privacy"], [t.policyLinks.terms, "/policies#terms"],
    [t.policyLinks.accessibility, "/policies#accessibility"], [t.policyLinks.disclaimer, "/policies#disclaimer"],
  ];

  return (
    <footer className={`cv-section mt-16 border-t-4 border-navy bg-[#eef2f8] text-slate-700 ${hi}`}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/img/uttarakhand.webp" alt="" width={48} height={48} className="h-12 w-12 object-contain" />
            <div className="leading-tight">
              <div className="font-bold text-navy">{t.org}</div>
              <div className="text-xs text-slate-500">{t.district}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed">{t.footer.owner}</p>
          <p className="mt-3 font-devanagari font-bold text-indiagreen">स्वच्छ केदारनाथ · सुंदर केदारनाथ</p>
        </div>

        <FooterList title={t.footer.quick} items={quick} />
        <FooterList title={t.footer.policies} items={policies} />

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">{t.footer.help}</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-saffron" /> <span>{t.contact.office}, {t.contact.officeAddr}</span></li>
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
              <a href={`tel:+91${HELPLINE}`} className="font-semibold text-navy hover:underline">{t.contact.helpline}: {HELPLINE}</a>
            </li>
            <li className="flex gap-2"><Recycle className="mt-0.5 h-4 w-4 shrink-0 text-saffron" /> <span>{t.contact.booth}: {t.contact.boothAddr}</span></li>
          </ul>
        </div>
      </div>

      <div className="bg-navy text-white/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {t.org}, {t.district}. {t.footer.rights}.</p>
          <p>{t.footer.updated}: {UPDATED}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="inline-flex items-center gap-1.5 hover:text-navy hover:underline">
              <span aria-hidden className="text-saffron">›</span> {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
