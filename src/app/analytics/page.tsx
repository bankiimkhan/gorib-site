import type { Metadata } from "next";
import { AnalyticsClient } from "./AnalyticsClient";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "gorib.lol";

export const metadata: Metadata = {
  title: `Analytics & Viewers — Platform Insights | ${siteName}`,
  description:
    "Real-time viewer analytics, audience distribution by country, returning user loyalty, and watched minutes across movies, series, and live TV.",
  openGraph: {
    title: `Analytics & Viewers — Platform Insights | ${siteName}`,
    description:
      "Real-time viewer analytics, audience distribution by country, returning user loyalty, and watched minutes across movies, series, and live TV.",
  },
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
