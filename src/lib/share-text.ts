import type { Lang } from "./i18n";

interface ShareInput { bags: number; kg: number; url: string }

/**
 * The message sent by "Share" and "WhatsApp" on a certificate page — first person, warm and celebratory, written to be
 * forwarded to family groups. Gender-neutral Hindi (no "लाया/लाई"). The public link sits on its own line so WhatsApp
 * turns it into a preview card with the participant's name.
 */
export function shareMessage(lang: Lang, { bags, kg, url }: ShareInput) {
  const amount = Number(kg).toFixed(Number(kg) % 1 ? 2 : 0);
  if (lang === "hi") {
    return [
      "🏔️🎒 मैंने केदारनाथ से अपना कचरा खुद नीचे पहुंचाया!",
      "",
      `बाबा केदार के धाम से 16 कि.मी. का पैदल रास्ता, कंधे पर ${bags} बैग (${amount} कि.ग्रा.) कचरा — पैर थके थे, पर दिल बहुत खुश था! 💚`,
      "",
      "और ये देखिए — नगर पंचायत केदारनाथ ने इसके लिए मुझे प्रशस्ति पत्र दिया! 🏅😊",
      "",
      "अगली बार आपकी बारी: ऊपर से एक बैग लीजिए, नीचे लाइए और हमारे पहाड़ों को चमकता रखिए। ✨",
      "",
      "👉 मेरा प्रमाण पत्र यहाँ देखें:",
      url,
      "",
      "जय बाबा केदार 🙏 #CarryMeBack #स्वच्छ_केदारनाथ",
    ].join("\n");
  }
  return [
    "🏔️🎒 I carried my own trash all the way down from Kedarnath!",
    "",
    `16 km of trail from Baba Kedar's doorstep with ${bags} bag${bags > 1 ? "s" : ""} (${amount} kg) of waste on my back — tired legs, very happy heart! 💚`,
    "",
    "And guess what — Nagar Panchayat Kedarnath gave me a Certificate of Appreciation for it! 🏅😊",
    "",
    "Your turn next time: grab a bag at the top, bring it down, and let's keep our mountains sparkling clean. ✨",
    "",
    "👉 See my certificate here:",
    url,
    "",
    "Jai Baba Kedar 🙏 #CarryMeBack #SwachhKedarnath",
  ].join("\n");
}

export const shareTitle = (lang: Lang) => (lang === "hi" ? "मेरा कैरी मी बैक प्रशस्ति पत्र 🏅" : "My Carry Me Back certificate 🏅");

/**
 * WhatsApp share link. Uses api.whatsapp.com/send directly — NOT wa.me: wa.me's redirect re-encodes the text and turns
 * every emoji (4-byte UTF-8) into "�" (U+FFFD). api.whatsapp.com passes the text through intact on web, desktop and mobile.
 * `phone` is a 10-digit Indian mobile number (country code 91 is added).
 */
export function whatsappUrl(text: string, phone?: string | null) {
  const p = new URLSearchParams();
  if (phone) p.set("phone", `91${phone.replace(/\D/g, "").slice(-10)}`);
  p.set("text", text);
  // URLSearchParams encodes spaces as "+", which WhatsApp shows literally on some clients — use %20.
  return `https://api.whatsapp.com/send?${p.toString().replace(/\+/g, "%20")}`;
}
