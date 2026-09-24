import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTVDetails, getTVSeason } from "@/lib/api/tmdb/client";
import { resolveEpisodeStream } from "@/lib/api/streaming/resolver";
import { WatchTVClient } from "./WatchTVClient";
import { AdSlot } from "@/components/ads/AdSlot";
import { MediaRow } from "@/components/common/MediaRow";

/** Parses ?season= / ?episode=, falling back on missing or malformed values. */
function parsePositiveInt(
  value: string | string[] | undefined,
  fallback: number,
  min: number
): number {
  const n = parseInt(String(Array.isArray(value) ? value[0] : value ?? ""), 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

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
  const season = parsePositiveInt(resolvedQuery.season, 1, 0);
  const episode = parsePositiveInt(resolvedQuery.episode, 1, 1);

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
  const season = parsePositiveInt(resolvedQuery.season, 1, 0);
  const episode = parsePositiveInt(resolvedQuery.episode, 1, 1);

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
    year: tvShow.year,
    imdbId: tvShow.imdbId,
  });

  return (
    <div className="min-h-screen">
      <WatchTVClient
        tvShow={tvShow}
        season={season}
        episode={episode}
        streamResult={streamResult}
        seasonData={seasonData}
      />

      {/* Below the player and its controls only; renders nothing for non-player-safe providers. */}
      <AdSlot placement="player-bottom" />

      {tvShow.recommendations && tvShow.recommendations.length > 0 && (
        <div className="pb-16">
          <MediaRow title="More Like This" items={tvShow.recommendations} />
        </div>
      )}
    </div>
  );
}

