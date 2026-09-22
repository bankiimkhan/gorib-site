import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gorib.lol";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/watch/"], // Disallow indexing stream playback endpoints and raw API routes
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

