import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTVDetails, getTVSeason } from "@/lib/api/tmdb/client";
import { TVDetailsClient } from "./TVDetailsClient";

interface TVPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TVPageProps): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) return { title: "TV Show Not Found" };

  const tvShow = await getTVDetails(tmdbId);
  if (!tvShow) return { title: "TV Show Not Found" };

  return {
    title: `${tvShow.title} — Seasons & Episodes`,
    description: tvShow.overview,
    openGraph: {
      title: tvShow.title,
      description: tvShow.overview,
      images: tvShow.backdropUrl ? [tvShow.backdropUrl] : undefined,
    },
  };
}

export default async function TVDetailsPage({ params }: TVPageProps) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId)) {
    notFound();
  }

  const tvShow = await getTVDetails(tmdbId);
  if (!tvShow) {
    notFound();
  }

  // Start at the first real season (some shows have no "Season 1", only specials or later seasons).
  const firstSeason =
    tvShow.seasons?.find((s) => s.seasonNumber > 0 && s.episodeCount > 0)?.seasonNumber ?? 1;
  const initialSeason = await getTVSeason(tmdbId, firstSeason);

  return <TVDetailsClient tvShow={tvShow} initialSeason={initialSeason} />;
}

