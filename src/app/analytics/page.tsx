import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AnalyticsClient } from "./AnalyticsClient";
import { AnalyticsLogin } from "./AnalyticsLogin";
import {
  ANALYTICS_SESSION_COOKIE,
  hasAnalyticsAccess,
  isAnalyticsAccessConfigured,
} from "@/lib/analytics/admin";

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
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const hasAccess = await hasAnalyticsAccess(cookieStore.get(ANALYTICS_SESSION_COOKIE)?.value);

  if (!hasAccess) {
    return <AnalyticsLogin configured={isAnalyticsAccessConfigured()} />;
  }

  return <AnalyticsClient />;
}
