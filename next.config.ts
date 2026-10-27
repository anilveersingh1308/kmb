import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // AVIF first (smallest), WebP fallback; optimised variants are cached for a year.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600],
    imageSizes: [72, 128, 256, 320],
  },
  async headers() {
    return [
      {
        // Photos and logos are re-generated in place (same names), so cache for a week and refresh in the background.
        source: "/:file((?:img/.*|uttarakhand-logo\\.png|signature(?:-sdm)?\\.png))",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
