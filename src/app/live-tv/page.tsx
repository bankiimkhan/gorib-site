import React from "react";
import { Metadata } from "next";
import { getIPTVChannels, IPTV_CATEGORIES, IPTV_COUNTRIES } from "@/lib/api/iptv/client";
import { LiveTVClient } from "./LiveTVClient";

export const revalidate = 3600; // Cache page for 1 hour

export const metadata: Metadata = {
  title: "Live TV — Free International & Regional Channels",
  description:
    "Watch free-to-air live television broadcasts from Bangladesh, India, USA, UK, and worldwide. Stream news, sports, entertainment, and movies powered by iptv-org.",
  keywords: [
    "live tv",
    "iptv",
    "bangladesh live tv",
    "free tv channels",
    "stream tv live",
    "news live",
    "sports live",
  ],
};

export default async function LiveTVPage() {
  const initialData = await getIPTVChannels({
    country: "all",
    category: "all",
    limit: 60,
  });

  return (
    <LiveTVClient
      initialChannels={initialData.channels}
      categories={IPTV_CATEGORIES}
      countries={IPTV_COUNTRIES}
    />
  );
}

