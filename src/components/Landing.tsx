import Image from "next/image";
import {
  ArrowRight, ShieldCheck, Megaphone, PackageOpen, Footprints, Recycle, Mail, CheckCircle2, PenLine, QrCode, Hash, FileDown,
  Phone, MapPin, Building2, Leaf, Mountain, Users, MapPinned,
} from "lucide-react";
import Certificate from "./Certificate";
import GovHeader from "./GovHeader";
import GovFooter from "./GovFooter";
import LiveCounter from "./landing/LiveCounter";
import VerifyForm from "./landing/VerifyForm";
import PhotoGallery from "./landing/PhotoGallery";
import { SITE, HELPLINE } from "@/lib/site-text";
import { ABOUT, DRIVES, HERO, JOURNEY } from "@/lib/photos";
import type { Lang } from "@/lib/i18n";

const SAMPLE = { full_name: "Shree Vikram", bag_quantity: 1, waste_kg: 1, serial_no: "CMB-2026-000001", issued_on: new Date().toISOString().slice(0, 10) };

/**
 * Server-rendered landing page. Only small islands hydrate (header, counters, verify form, gallery, sample certificate)
 * — no animation library on this route.
 */
export default function Landing({ counts, lang }: { counts: { certificates: number; bags: number; kg: number }; lang: Lang }) {
  const t = SITE[lang];
  const hi = lang === "hi" ? "font-devanagari" : "";
  const cap = (p: { hi: string; en: string }) => (lang === "hi" ? p.hi : p.en);
  const stepIcons = [PackageOpen, Footprints, Recycle, Mail];
  const certIcons = [PenLine, QrCode, Hash, FileDown];

  return (
    <>
      <GovHeader lang={lang} active="home" />

      {/* Notice board */}
      <div className="border-b border-line bg-[#fff7ef]">
        <div className={`mx-auto flex max-w-7xl items-stretch px-0 sm:px-6 ${hi}`}>
          <div className="flex shrink-0 items-center gap-1.5 bg-saffron px-3 py-2 text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
            <Megaphone className="h-4 w-4" /> {t.latest}
          </div>
          <div className="marquee relative min-w-0 flex-1 overflow-hidden" tabIndex={0} aria-label={t.latest}>
            <div className="marquee-track whitespace-nowrap py-2 text-sm text-slate-800">
              {[...t.notices, ...t.notices].map((n, i) => (
                <span key={i} className="mx-6 inline-flex items-center gap-2" aria-hidden={i >= t.notices.length}>
                  <span className="h-1.5 w-1.5 rounded-full bg-indiagreen" /> {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main id="main">
        {/* HERO */}
        <section className="bg-[linear-gradient(180deg,#f4f6fa_0%,#ffffff_100%)]">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:py-14">
            <div className={hi}>
              <p className="inline-flex items-center gap-2 rounded-full border border-saffron/40 bg-white px-3 py-1 text-xs font-semibold text-[#b4520a]">
                <Mountain className="h-3.5 w-3.5" /> {lang === "hi" ? "केदारनाथ धाम · 3,583 मीटर · रुद्रप्रयाग" : "Kedarnath Dham · 3,583 m · Rudraprayag"}
              </p>
              <p className="mt-5 text-base font-semibold text-indiagreen">{t.heroKicker}</p>
              <h1 className="mt-2 text-4xl font-bold leading-tight text-navy sm:text-5xl">{t.heroTitle}</h1>
              <p className="mt-2 font-sans text-2xl font-bold text-saffron sm:text-3xl">({t.heroLatin})</p>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-700 sm:text-lg">{t.heroBody}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#verify" className="btn-gold inline-flex items-center gap-2 rounded-md px-5 py-3 font-semibold">
                  <ShieldCheck className="h-5 w-5" /> {t.ctaVerify}
                </a>
                <a href="#how" className="btn-ghost inline-flex items-center gap-2 rounded-md px-5 py-3 font-semibold">
                  {t.ctaHow} <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <a href={`tel:+91${HELPLINE}`} className="mt-6 inline-flex items-center gap-2 text-sm text-slate-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indiagreen text-white"><Phone className="h-4 w-4" /></span>
                {t.contact.helpline}: <b className="text-navy">{HELPLINE}</b>
              </a>
            </div>
            <figure className="relative">
              <div className="relative aspect-[16/11] overflow-hidden rounded-lg border border-line bg-[#e9eef5] shadow-[0_20px_50px_-25px_rgba(11,47,107,.45)]">
                {/* LCP element: preloaded at high priority; the blur placeholder paints instantly */}
                <Image src={HERO.src} alt={cap(HERO)} fill priority placeholder="blur" sizes="(max-width: 1024px) 100vw, 640px"
                  style={{ objectPosition: HERO.pos }} className="object-cover" />
              </div>
              <figcaption className={`absolute -bottom-4 left-4 right-4 rounded-md border-l-4 border-saffron bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-md sm:left-6 sm:right-auto ${hi}`}>
                {t.aboutSlogan}
              </figcaption>
            </figure>
          </div>
        </section>

        {/* STATS */}
        <section aria-label={t.stats.live} className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              [counts.bags, t.stats.bags, "border-t-saffron", Recycle],
              [counts.kg, t.stats.kg, "border-t-navy", Leaf],
              [counts.certificates, t.stats.certs, "border-t-indiagreen", CheckCircle2],
            ] as const).map(([n, label, border, Icon]) => (
              <div key={label} className={`card flex items-center gap-4 border-t-4 p-5 ${border}`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef3fb] text-navy"><Icon className="h-6 w-6" /></span>
                <div>
                  <div className="text-3xl font-bold text-navy"><LiveCounter to={Number(n)} /></div>
                  <div className={`text-sm text-slate-600 ${hi}`}>{label}</div>
                </div>
              </div>
            ))}
          </div>
          <p className={`mt-2 flex items-center gap-1.5 text-xs text-slate-500 ${hi}`}>
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indiagreen opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-indiagreen" /></span>
            {t.stats.live}
          </p>
        </section>

        {/* ABOUT */}
        <section id="about" className={`cv-section mx-auto max-w-7xl scroll-mt-16 px-4 py-14 sm:px-6 ${hi}`}>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="section-title text-3xl">{t.aboutTitle}</h2>
              {t.aboutBody.map((p) => <p key={p} className="mt-5 leading-relaxed text-slate-700">{p}</p>)}
              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {t.aboutPoints.map((p, i) => {
                  const I = [Mountain, Leaf, Users][i];
                  return (
                    <li key={p} className="card flex items-start gap-3 p-4 text-sm font-medium text-slate-800">
                      <I className="mt-0.5 h-5 w-5 shrink-0 text-indiagreen" /> {p}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[ABOUT.team, ABOUT.story].map((p) => (
                  <figure key={p.src.src} className="overflow-hidden rounded-lg border border-line bg-white">
                    <div className="relative aspect-[4/3] bg-[#e9eef5]">
                      <Image src={p.src} alt={cap(p)} fill placeholder="blur" sizes="(max-width: 640px) 100vw, 380px" style={{ objectPosition: p.pos }} className="object-cover" />
                    </div>
                    <figcaption className="px-3 py-2 text-xs text-slate-600">{cap(p)}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <figure className="card self-start overflow-hidden">
              <div className="border-b border-line bg-[#eef3fb] px-4 py-2.5 text-sm font-bold text-navy">{lang === "hi" ? "अभियान पोस्टर" : "Campaign poster"}</div>
              <Image src={ABOUT.poster.src} alt={cap(ABOUT.poster)} placeholder="blur" sizes="(max-width: 1024px) 100vw, 460px" className="h-auto w-full" />
            </figure>
          </div>
        </section>

        {/* HOW */}
        <section id="how" className={`cv-section scroll-mt-16 bg-[#f4f6fa] py-14 ${hi}`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="section-title center inline-block text-3xl">{t.howTitle}</h2>
              <p className="mt-3 text-slate-600">{t.howSub}</p>
            </div>
            <ol className="relative mt-10 grid gap-6 md:grid-cols-4">
              <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-7 hidden border-t-2 border-dashed border-navy/30 md:block" />
              {t.steps.map(([title, body], i) => {
                const I = stepIcons[i];
                return (
                  <li key={title} className="relative text-center">
                    <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-navy text-white shadow-md">
                      <I className="h-6 w-6" />
                      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-saffron font-sans text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="card mt-4 h-[calc(100%-4.5rem)] p-5">
                      <h3 className="font-bold text-navy">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* JOURNEY — where the waste goes */}
        <section className={`cv-section mx-auto max-w-7xl px-4 py-14 sm:px-6 ${hi}`}>
          <h2 className="section-title text-3xl">{t.journeyTitle}</h2>
          <p className="mt-3 max-w-3xl text-slate-600">{t.journeySub}</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {JOURNEY.map((p, i) => (
              <li key={p.src.src} className="card group relative flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-[inherit] bg-[#e9eef5]">
                  <Image src={p.src} alt={cap(p)} fill placeholder="blur" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 250px"
                    style={{ objectPosition: p.pos }} className="object-cover transition duration-500 group-hover:scale-[1.04]" />
                  <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-saffron font-sans text-xs font-bold text-white shadow">{i + 1}</span>
                </div>
                <div className="flex-1 p-4">
                  <h3 className="font-bold text-navy">{lang === "hi" ? p.titleHi : p.titleEn}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">{cap(p)}</p>
                </div>
                {i < JOURNEY.length - 1 && (
                  <ArrowRight aria-hidden className="absolute -right-3.5 top-[calc(37.5%-0.75rem)] z-10 hidden h-6 w-6 rounded-full border border-line bg-white p-1 text-navy shadow-sm lg:block" />
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* CERTIFICATE */}
        <section className={`cv-section bg-[#f4f6fa] py-14 ${hi}`}>
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="section-title text-3xl">{t.certTitle}</h2>
              <p className="mt-5 leading-relaxed text-slate-700">{t.certBody}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {t.certPoints.map(([title, body], i) => {
                  const I = certIcons[i];
                  return (
                    <li key={title} className="card flex gap-3 p-4">
                      <I className="mt-0.5 h-5 w-5 shrink-0 text-saffron" />
                      <div>
                        <div className="text-sm font-bold text-navy">{title}</div>
                        <div className="mt-0.5 text-sm text-slate-600">{body}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <figure>
              <div className="rounded-lg border border-line bg-white p-3 shadow-[0_20px_50px_-25px_rgba(11,47,107,.4)] sm:p-4">
                <div className="overflow-hidden rounded ring-1 ring-line">
                  <Certificate data={SAMPLE} verifyUrl="https://carrymeback.in/c/sample?via=qr" lang={lang} />
                </div>
              </div>
              <figcaption className="mt-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">{t.sampleNote}</figcaption>
            </figure>
          </div>
        </section>

        {/* DRIVES */}
        <section className={`cv-section mx-auto max-w-7xl px-4 py-14 sm:px-6 ${hi}`}>
          <h2 className="section-title text-3xl">{t.drivesTitle}</h2>
          <p className="mt-3 max-w-3xl text-slate-600">{t.drivesSub}</p>
          <div className="mt-8 grid gap-3 md:grid-cols-4 md:grid-rows-2">
            {DRIVES.map((p, i) => (
              <figure key={p.src.src} className={`group relative overflow-hidden rounded-lg border border-line bg-[#e9eef5] ${i === 0 ? "aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto" : "aspect-[4/3]"}`}>
                <Image src={p.src} alt={cap(p)} fill placeholder="blur"
                  sizes={i === 0 ? "(max-width: 768px) 100vw, 640px" : "(max-width: 768px) 100vw, 320px"}
                  style={{ objectPosition: p.pos }} className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                {p.geo && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 font-sans text-[11px] font-semibold text-indiagreen shadow-sm">
                    <MapPinned className="h-3 w-3" /> {t.drivesGeo} · {p.geo}
                  </span>
                )}
                <figcaption className={`absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(11,31,64,.85),transparent)] px-3 pb-2.5 pt-8 font-medium text-white ${i === 0 ? "text-sm sm:text-base" : "text-xs"}`}>
                  {cap(p)}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* GALLERY */}
        <section id="gallery" className={`cv-section scroll-mt-16 bg-[#f4f6fa] py-14 ${hi}`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="section-title text-3xl">{t.galleryTitle}</h2>
            <p className="mt-3 text-slate-600">{t.gallerySub}</p>
            <PhotoGallery lang={lang} />
          </div>
        </section>

        {/* VERIFY */}
        <section id="verify" className={`mx-auto max-w-4xl scroll-mt-16 px-4 py-14 sm:px-6 ${hi}`}>
          <div className="card overflow-hidden">
            <div className="flex items-center gap-3 bg-navy px-6 py-4 text-white">
              <ShieldCheck className="h-7 w-7 text-[#7fd17a]" />
              <h2 className="text-xl font-bold sm:text-2xl">{t.verifyTitle}</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-700">{t.verifyBody}</p>
              <VerifyForm title={t.verifyTitle} placeholder={t.verifyPlaceholder} button={t.verifyBtn} error={t.verifyErr} />
              <p id="verify-hint" className="mt-4 flex items-start gap-2 rounded-md bg-[#eef8ee] px-3 py-2.5 text-sm text-[#0e5a07]">
                <QrCode className="mt-0.5 h-4 w-4 shrink-0" /> {t.verifyHint}
              </p>
            </div>
          </div>
        </section>

        {/* PARTNERS + CONTACT */}
        <section id="contact" className={`cv-section scroll-mt-16 border-t border-line bg-white ${hi}`}>
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="section-title text-3xl">{t.partnersTitle}</h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-3">
                {t.partners.map(([name, role], i) => (
                  <li key={name} className="card flex flex-col items-center p-5 text-center">
                    <div className="flex h-20 items-center justify-center">
                      {i === 0 && <Image src="/img/uttarakhand.webp" alt="" width={72} height={73} className="h-[72px] w-[71px] object-contain" />}
                      {i === 1 && <Image src="/img/healing-himalayas.webp" alt="" width={72} height={72} className="h-[72px] w-[72px] object-contain" />}
                      {i === 2 && <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef8ee] text-indiagreen"><Building2 className="h-8 w-8" /></span>}
                    </div>
                    <div className="mt-3 font-bold text-navy">{name}</div>
                    <div className="text-xs text-slate-500">{role}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="section-title text-3xl">{t.contactTitle}</h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                <ContactCard icon={Building2} title={t.contact.office} body={t.contact.officeAddr} />
                <ContactCard icon={Phone} title={`${t.contact.helpline}: ${HELPLINE}`} body={t.contact.helplineNote} href={`tel:+91${HELPLINE}`} />
                <ContactCard icon={PackageOpen} title={t.contact.mrf} body={t.contact.mrfAddr} />
                <ContactCard icon={MapPin} title={t.contact.booth} body={t.contact.boothAddr} />
              </ul>
            </div>
          </div>
        </section>
      </main>

      <GovFooter lang={lang} />
    </>
  );
}

function ContactCard({ icon: I, title, body, href }: { icon: typeof Phone; title: string; body: string; href?: string }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff1e5] text-saffron"><I className="h-5 w-5" /></span>
      <div>
        <div className="font-bold text-navy">{title}</div>
        <div className="mt-0.5 text-sm text-slate-600">{body}</div>
      </div>
    </>
  );
  return (
    <li className="card">
      {href ? <a href={href} className="flex gap-3 p-4 hover:bg-[#f4f6fa]">{inner}</a> : <div className="flex gap-3 p-4">{inner}</div>}
    </li>
  );
}
