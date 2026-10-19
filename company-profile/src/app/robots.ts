import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/id/preview/", "/en/preview/"],
    },
    sitemap: "https://ubg.id/sitemap.xml",
  };
}
