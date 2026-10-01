import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/types";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/c/", "/admin", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
