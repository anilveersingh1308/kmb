export type Lang = "hi" | "en";

export const LANG_COOKIE = "cmb_lang";

export function normalizeLang(v: unknown): Lang | null {
  return v === "en" || v === "hi" ? v : null;
}

/** Everything printed on the certificate, per language. */
export const CERT_TEXT = {
  hi: {
    state: "उत्तराखण्ड राज्य",
    office: "कार्यालय नगर पंचायत केदारनाथ",
    district: "रुद्रप्रयाग (उत्तराखंड)",
    title: "प्रशस्ति पत्र",
    subtitle: "CERTIFICATE OF APPRECIATION",
    presented: "यह प्रमाण पत्र अत्यंत गौरव के साथ",
    body1: "को केदारनाथ धाम की पावन और संवेदनशील भूमि को स्वच्छ, प्लास्टिक मुक्त एवं पर्यावरण के अनुकूल बनाए रखने हेतु आयोजित 'कैरी मी बैक' (",
    bodyLatin: "Carry Me Back",
    body2: ") जन-जागरूकता एवं स्वच्छता पहल में एक निष्ठावान वॉलेंटियर के रूप में अपना अमूल्य एवं अनुकरणीय योगदान देने के लिए प्रदान किया जाता है। हिमालयी पारिस्थितिकी के संरक्षण और बाबा केदार के आंगन की गरिमा बनाए रखने के लिए आपका यह निःस्वार्थ सेवा भाव अत्यंत वंदनीय एवं प्रेरणास्पद है। नगर पंचायत केदारनाथ आपके इस उत्कृष्ट प्रयास की सराहना करता है तथा आपके सुखद एवं मंगलमय भविष्य की कामना करता है।",
    slogan: "स्वच्छ केदारनाथ सुंदर केदारनाथ",
    signatory: "अधिशासी अधिकारी",
    signatoryOrg: "नगर पंचायत केदारनाथ",
    collaboration: "in collaboration with Nagar Panchayat, Healing Himalayas, and Sulabh International",
    ariaLabel: (n: string) => `${n} के लिए प्रशस्ति पत्र`,
  },
  en: {
    state: "State of Uttarakhand",
    office: "Office of Nagar Panchayat Kedarnath",
    district: "Rudraprayag (Uttarakhand)",
    title: "Certificate of Appreciation",
    subtitle: "",
    presented: "This certificate is presented with great pride to",
    body1: "for their invaluable and exemplary contribution as a dedicated volunteer in the ‘",
    bodyLatin: "Carry Me Back",
    body2: "’ (कैरी मी बैक) public-awareness and cleanliness initiative, organised to keep the sacred and ecologically sensitive land of Kedarnath Dham clean, plastic-free and environment-friendly. Your selfless service in protecting the Himalayan ecology and preserving the dignity of Baba Kedar’s abode is deeply commendable and inspiring. Nagar Panchayat Kedarnath applauds this outstanding effort and wishes you a happy and auspicious future.",
    slogan: "Clean Kedarnath · Beautiful Kedarnath",
    signatory: "Executive Officer",
    signatoryOrg: "Nagar Panchayat Kedarnath",
    collaboration: "in collaboration with Nagar Panchayat, Healing Himalayas, and Sulabh International",
    ariaLabel: (n: string) => `Certificate of Appreciation for ${n}`,
  },
} as const;

/** UI strings for the public pages. */
export const UI = {
  hi: {
    congrats: "बधाई हो,",
    thanksLine: "🙏 बाबा केदार के आंगन को स्वच्छ रखने में आपका योगदान अमूल्य है",
    carried: (bags: number, kg: string) => `आपने ${bags} बैग · ${kg} कि.ग्रा. कचरा पावन मार्ग से नीचे लाया। आपके कारण केदारनाथ थोड़ा और स्वच्छ है।`,
    verified: "सत्यापित प्रमाण पत्र",
    download: "PDF डाउनलोड",
    print: "प्रिंट",
    share: "साझा करें",
    copy: "लिंक कॉपी",
    copied: "कॉपी हो गया",
    again: "फिर से जश्न",
    serial: "क्रमांक",
    issued: "जारी तिथि",
    bags: "बैग",
    waste: "कचरा हटाया",
    authentic: "✓ असली प्रमाण पत्र · Authentic certificate",
    uniqueQr: "विशिष्ट सत्यापन कोड",
    footerSlogan: "स्वच्छ केदारनाथ · सुंदर केदारनाथ",
    privacy: "हम केवल वही जानकारी रखते हैं जो यह प्रमाण पत्र जारी करने के लिए आवश्यक है। जारीकर्ता: नगर पंचायत केदारनाथ, रुद्रप्रयाग (उत्तराखंड)।",
    langLabel: "English",
  },
  en: {
    congrats: "Congratulations,",
    thanksLine: "🙏 Your contribution to keeping Baba Kedar's abode clean is invaluable",
    carried: (bags: number, kg: string) => `You carried ${bags} bag${bags > 1 ? "s" : ""} · ${kg} kg of waste down the sacred trail. Kedarnath breathes a little easier because of you.`,
    verified: "Verified certificate",
    download: "Download PDF",
    print: "Print",
    share: "Share",
    copy: "Copy link",
    copied: "Link copied",
    again: "Celebrate again",
    serial: "Serial",
    issued: "Issued",
    bags: "Bags carried",
    waste: "Waste removed",
    authentic: "✓ Authentic certificate · यह प्रमाण पत्र असली है",
    uniqueQr: "Unique verification code",
    footerSlogan: "Clean Kedarnath · Beautiful Kedarnath",
    privacy: "We store only what is needed to issue this certificate. Issued by Nagar Panchayat Kedarnath, Rudraprayag (Uttarakhand).",
    langLabel: "हिंदी",
  },
} as const;
