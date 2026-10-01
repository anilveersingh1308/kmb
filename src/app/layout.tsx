import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/types";

// Loaded via <link> rather than next/font: Turbopack's Google-font resolver is unreliable for multi-weight Devanagari.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif:ital,wght@0,700;1,400&family=Poppins:wght@400;500;600;700&display=swap";

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
    images: [{ url: "/og.svg", width: 1200, height: 630 }],
  },
  icons: { icon: "/emblem.svg" },
};

export const viewport: Viewport = {
  themeColor: "#7A1F1F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body className="min-h-dvh bg-[#0b0d12] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
