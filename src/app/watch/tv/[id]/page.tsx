import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTVDetails, getTVSeason } from "@/lib/api/tmdb/client";
import { resolveEpisodeStream } from "@/lib/api/streaming/resolver";
import { WatchTVClient } from "./WatchTVClient";
import { AdSlot } from "@/components/ads/AdSlot";

interface WatchTVPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: WatchTVPageProps): Promise<Metadata> {
  const { id } = await params;
  const resolvedQuery = await searchParams;
  const tmdbId = parseInt(id, 10);
  const season = parseInt(String(resolvedQuery.season || "1"), 10);
  const episode = parseInt(String(resolvedQuery.episode || "1"), 10);

  if (isNaN(tmdbId)) return { title: "Watch TV" };

  const tvShow = await getTVDetails(tmdbId);
  return {
    title: tvShow
      ? `Watch ${tvShow.title} — Season ${season} Episode ${episode}`
      : "Watch TV",
    description: tvShow?.overview,
  };
}

export default async function WatchTVPage({ params, searchParams }: WatchTVPageProps) {
  const { id } = await params;
  const resolvedQuery = await searchParams;

  const tmdbId = parseInt(id, 10);
  const season = parseInt(String(resolvedQuery.season || "1"), 10);
  const episode = parseInt(String(resolvedQuery.episode || "1"), 10);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    notFound();
  }

  const tvShow = await getTVDetails(tmdbId);
  if (!tvShow) {
    notFound();
  }

  // Fetch season episodes
  const seasonData = await getTVSeason(tmdbId, season);

  // Resolve stream source
  const streamResult = await resolveEpisodeStream({
    tmdbId,
    season,
    episode,
    title: tvShow.title,
    imdbId: tvShow.imdbId,
  });

  return (
    <div className="min-h-screen bg-[#07090e]">
      <WatchTVClient
        tvShow={tvShow}
        season={season}
        episode={episode}
        streamResult={streamResult}
        seasonData={seasonData}
      />

      <AdSlot placement="player-bottom" />
    </div>
  );
}

