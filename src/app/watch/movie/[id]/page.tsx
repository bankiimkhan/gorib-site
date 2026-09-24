import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getMovieDetails } from "@/lib/api/tmdb/client";
import { resolveMovieStream } from "@/lib/api/streaming/resolver";
import { WatchMovieClient } from "./WatchMovieClient";
import { MediaRow } from "@/components/common/MediaRow";
import { AdSlot } from "@/components/ads/AdSlot";

interface WatchMoviePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WatchMoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) return { title: "Watch Movie" };

  const movie = await getMovieDetails(tmdbId);
  return {
    title: movie ? `Watch ${movie.title}` : "Watch Movie",
    description: movie?.overview,
  };
}

export default async function WatchMoviePage({ params }: WatchMoviePageProps) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId) || tmdbId <= 0) {
    notFound();
  }

  const movie = await getMovieDetails(tmdbId);
  if (!movie) {
    notFound();
  }

  // Resolve stream source
  const streamResult = await resolveMovieStream({
    tmdbId,
    title: movie.title,
    year: movie.year,
    imdbId: movie.imdbId,
  });

  const similarMovies = movie.recommendations || [];

  return (
    <div className="min-h-screen">
      <WatchMovieClient movie={movie} streamResult={streamResult} />

      {/* Below the player and its controls only; renders nothing for non-player-safe providers. */}
      <AdSlot placement="player-bottom" />

      {similarMovies.length > 0 && (
        <div className="pb-16">
          <MediaRow title="More Like This" items={similarMovies} />
        </div>
      )}
    </div>
  );
}

