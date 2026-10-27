import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Noto_Serif, Poppins } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/types";

// Self-hosted at build time: no third-party request, preloaded, size-adjusted Latin fallbacks.
// Devanagari subset only — Latin characters in Hindi lines fall back to Poppins. Header bands have fixed heights, so the swap can't shift layout.
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], variable: "--nf-devanagari", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--nf-poppins", display: "swap" });
// Serif is only used on the certificate — don't preload it on every page.
const serif = Noto_Serif({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--nf-serif", display: "swap", preload: false });

// Only the non-default sizes (A- = "0", A+ = "2") are ever stored or applied; the default leaves <html> untouched.
const TEXT_SIZE_BOOT = `try{var z={"0":"87.5%","2":"112.5%"}[localStorage.getItem("cmb_text_size")];if(z)document.documentElement.style.fontSize=z}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Carry Me Back · कैरी मी बैक | Nagar Panchayat Kedarnath",
    template: "%s | Carry Me Back · Kedarnath",
  },
  description:
    "Carry 1 kg of waste down from Kedarnath Dham and receive a personalised Certificate of Appreciation from Nagar Panchayat Kedarnath. स्वच्छ केदारनाथ, सुंदर केदारनाथ।",
  openGraph: {
    type: "website",
    siteName: "Carry Me Back · Kedarnath",
    title: "Carry Me Back · कैरी मी बैक",
    description: "A cleanliness movement at 3,583 m. Carry it down. Earn your certificate.",
    images: [{ url: "/img/og.jpg", width: 1200, height: 630 }],
  },
  icons: { icon: "/uttarakhand-logo.png", apple: "/uttarakhand-logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#0B2F6B",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning (applies to these two elements' own attributes only, not their children):
    // <html> gets an inline font-size from TEXT_SIZE_BOOT before React loads when the visitor chose A-/A+, and
    // browser extensions (e.g. Liner, data-be-installed) add attributes to <html>/<body>. Neither is a real mismatch.
    <html lang="hi" className={`${devanagari.variable} ${poppins.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the visitor's saved text size (GovHeader A-/A/A+) before first paint, so the page never resizes after loading. */}
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_BOOT }} />
      </head>
      <body className="min-h-dvh bg-white text-ink antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
