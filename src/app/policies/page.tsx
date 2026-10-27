import type { Metadata } from "next";
import GovHeader from "@/components/GovHeader";
import GovFooter from "@/components/GovFooter";
import { getLang } from "@/lib/lang-server";
import { HELPLINE } from "@/lib/site-text";

export const metadata: Metadata = { title: "Website Policies · वेबसाइट नीतियां" };

const SECTIONS = {
  en: [
    ["privacy", "Privacy Policy", [
      "This website collects only the details needed to issue a Certificate of Appreciation: the participant's name, mobile number, email address and bag details, recorded by campaign staff at the collection booth.",
      "Mobile numbers and email addresses are never displayed on public certificate pages and are not shared with or sold to any third party. Email is used only to deliver the certificate.",
      "Certificate links contain an unguessable code. Only a person holding the link, or the printed QR code, can open a certificate.",
    ]],
    ["terms", "Terms & Conditions", [
      "Certificates are issued by Nagar Panchayat Kedarnath in recognition of voluntary participation in the Carry Me Back campaign and carry no monetary value.",
      "A certificate is genuine only if its link or QR code opens on this website and matches the official register. Altering or forging a certificate is not permitted.",
      "Nagar Panchayat Kedarnath may update these terms and the content of this website at any time.",
    ]],
    ["accessibility", "Accessibility Statement", [
      "This website aims to meet the Guidelines for Indian Government Websites (GIGW) and WCAG 2.1 level AA. It supports keyboard navigation, a skip-to-content link, adjustable text size (A- / A / A+), and Hindi and English content.",
      `If you face any difficulty in accessing information on this website, please call the helpline ${HELPLINE}.`,
    ]],
    ["disclaimer", "Disclaimer", [
      "Every effort has been made to ensure the accuracy of the information on this website. It should not, however, be construed as a statement of law. In case of any ambiguity, please contact the office of Nagar Panchayat Kedarnath.",
    ]],
  ],
  hi: [
    ["privacy", "गोपनीयता नीति", [
      "यह वेबसाइट केवल वही जानकारी एकत्र करती है जो प्रशस्ति पत्र जारी करने हेतु आवश्यक है — प्रतिभागी का नाम, मोबाइल नंबर, ईमेल पता एवं बैग का विवरण, जिसे कलेक्शन बूथ पर अभियान कर्मियों द्वारा दर्ज किया जाता है।",
      "मोबाइल नंबर एवं ईमेल पता सार्वजनिक प्रमाण पत्र पृष्ठ पर कभी प्रदर्शित नहीं किए जाते और किसी तृतीय पक्ष के साथ साझा नहीं किए जाते। ईमेल का उपयोग केवल प्रमाण पत्र भेजने हेतु किया जाता है।",
      "प्रमाण पत्र के लिंक में एक गोपनीय कोड होता है। केवल लिंक अथवा छपे QR कोड वाला व्यक्ति ही प्रमाण पत्र खोल सकता है।",
    ]],
    ["terms", "नियम एवं शर्तें", [
      "प्रशस्ति पत्र नगर पंचायत केदारनाथ द्वारा ‘कैरी मी बैक’ अभियान में स्वैच्छिक भागीदारी के सम्मान में जारी किए जाते हैं तथा इनका कोई मौद्रिक मूल्य नहीं है।",
      "कोई प्रमाण पत्र तभी मान्य है जब उसका लिंक या QR कोड इस वेबसाइट पर खुले और आधिकारिक रजिस्टर से मेल खाए। प्रमाण पत्र में परिवर्तन या जालसाज़ी वर्जित है।",
      "नगर पंचायत केदारनाथ किसी भी समय इन शर्तों एवं वेबसाइट की विषयवस्तु को अद्यतन कर सकती है।",
    ]],
    ["accessibility", "अभिगम्यता विवरण", [
      "यह वेबसाइट भारत सरकार की वेबसाइटों हेतु दिशानिर्देश (GIGW) एवं WCAG 2.1 (AA) के अनुरूप बनाई गई है। इसमें कीबोर्ड नेविगेशन, ‘मुख्य विषयवस्तु पर जाएं’ लिंक, पाठ का आकार बदलने (A- / A / A+) की सुविधा तथा हिंदी व अंग्रेज़ी विषयवस्तु उपलब्ध है।",
      `वेबसाइट पर जानकारी प्राप्त करने में किसी भी कठिनाई की स्थिति में कृपया हेल्पलाइन ${HELPLINE} पर संपर्क करें।`,
    ]],
    ["disclaimer", "अस्वीकरण", [
      "इस वेबसाइट पर दी गई जानकारी की शुद्धता सुनिश्चित करने का हर संभव प्रयास किया गया है, तथापि इसे विधि का कथन न माना जाए। किसी भी संदेह की स्थिति में कृपया कार्यालय नगर पंचायत केदारनाथ से संपर्क करें।",
    ]],
  ],
} as const;

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: langParam } = await searchParams;
  const lang = await getLang(langParam);
  const hi = lang === "hi" ? "font-devanagari" : "";
  return (
    <>
      <GovHeader lang={lang} />
      <main id="main" className={`mx-auto max-w-4xl px-4 py-10 sm:px-6 ${hi}`}>
        <h1 className="section-title text-3xl">{lang === "hi" ? "वेबसाइट नीतियां" : "Website Policies"}</h1>
        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
          {SECTIONS[lang].map(([id, title]) => (
            <a key={id} href={`#${id}`} className="btn-ghost rounded px-3 py-1.5 text-sm font-medium">{title}</a>
          ))}
        </nav>
        {SECTIONS[lang].map(([id, title, paras]) => (
          <section key={id} id={id} className="card mt-6 scroll-mt-16 p-6">
            <h2 className="text-xl font-bold text-navy">{title}</h2>
            {paras.map((p) => <p key={p} className="mt-3 leading-relaxed text-slate-700">{p}</p>)}
          </section>
        ))}
      </main>
      <GovFooter lang={lang} />
    </>
  );
}
