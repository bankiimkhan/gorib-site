"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MediaItem } from "@/types/media";
import { StreamResult } from "@/types/streaming";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { ServerSelector } from "@/components/player/ServerSelector";
import { WatchlistButton } from "@/components/common/WatchlistButton";
import { RatingBadge } from "@/components/details/DetailHero";
import { useContinueWatching } from "@/lib/hooks/useContinueWatching";
import { formatRuntime } from "@/lib/utils/formatters";

interface WatchMovieClientProps {
  movie: MediaItem;
  streamResult: StreamResult;
}

export function WatchMovieClient({ movie, streamResult }: WatchMovieClientProps) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(streamResult.defaultSourceIndex || 0);
  const { saveProgress, markStarted, getSavedPosition } = useContinueWatching();

  const initialTime = getSavedPosition(movie.tmdbId);

  // Embedded players don't report progress; record the title so it still
  // appears in Continue Watching.
  useEffect(() => {
    markStarted({
      tmdbId: movie.tmdbId,
      type: "movie",
      title: movie.title,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
    });
  }, [markStarted, movie.tmdbId, movie.title, movie.posterUrl, movie.backdropUrl]);

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    saveProgress({
      tmdbId: movie.tmdbId,
      type: "movie",
      title: movie.title,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      currentTime,
      duration,
    });
  };

  return (
    <div className="pt-16 lg:pt-[68px]">
      <div className="mx-auto w-full max-w-[1600px] sm:px-6 sm:pt-4 lg:px-10">
        <VideoPlayer
          title={movie.title}
          sources={streamResult.sources}
          poster={movie.backdropUrl || movie.posterUrl}
          initialTime={initialTime}
          activeSourceIndex={activeSourceIndex}
          onSourceChange={setActiveSourceIndex}
          onTimeUpdate={handleTimeUpdate}
        />
      </div>

      <div className="shell mx-auto max-w-[1600px] sm:px-6 lg:px-10">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/movie/${movie.tmdbId}`} className="btn btn-ghost btn-sm -ml-3">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Details
          </Link>
          <ServerSelector
            sources={streamResult.sources}
            activeSourceIndex={activeSourceIndex}
            onSelectSource={setActiveSourceIndex}
          />
        </div>

        <div className="mt-6 flex flex-col gap-5 border-b border-line pb-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{movie.title}</h1>
            <div className="meta-dot mt-2 flex flex-wrap items-center text-sm text-fg-muted">
              {movie.rating !== undefined && movie.rating > 0 && <RatingBadge rating={movie.rating} />}
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime ? <span>{formatRuntime(movie.runtime)}</span> : null}
            </div>
            {movie.genres.length > 0 && (
              <p className="mt-1 text-sm text-fg-subtle">{movie.genres.slice(0, 3).map((g) => g.name).join(", ")}</p>
            )}
            {movie.overview && <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">{movie.overview}</p>}
          </div>
          <WatchlistButton item={movie} variant="full" className="self-start" />
        </div>
      </div>
    </div>
  );
}
