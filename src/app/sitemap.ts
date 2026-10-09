import { MetadataRoute } from "next";
import { ALL_GENRES } from "@/lib/api/tmdb/genres";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gorib.lol";

  const lastModified = new Date();
  const corePages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/movies`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/tv`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/trending`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/live-tv`,
      lastModified,
      changeFrequency: "hourly",
      priority: 0.7,
    },
  ];

  return [
    ...corePages,
    ...ALL_GENRES.map((genre) => ({
      url: `${siteUrl}/genre/${genre.slug}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
