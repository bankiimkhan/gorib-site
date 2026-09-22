"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MediaItem } from "@/types/media";
import { StreamResult } from "@/types/streaming";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { ServerSelector } from "@/components/player/ServerSelector";
import { useContinueWatching } from "@/lib/hooks/useContinueWatching";
import { formatRating, formatRuntime } from "@/lib/utils/formatters";
import { ArrowLeft, Star, Calendar, Clock, Bookmark, Check } from "lucide-react";
import { useWatchlist } from "@/lib/hooks/useWatchlist";

interface WatchMovieClientProps {
  movie: MediaItem;
  streamResult: StreamResult;
}

export function WatchMovieClient({ movie, streamResult }: WatchMovieClientProps) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const { saveProgress, getSavedPosition } = useContinueWatching();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isBookmarked = isInWatchlist(movie.id);

  const initialTime = getSavedPosition(movie.tmdbId);

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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      {/* Top Breadcrumb / Back Link */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/movie/${movie.tmdbId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Movie Details</span>
        </Link>
      </div>

      {/* Dominant Cinema Player Container */}
      <div className="w-full shadow-2xl rounded-2xl overflow-hidden bg-black ring-1 ring-zinc-800">
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

      {/* Dedicated Server Selection Bar */}
      <ServerSelector
        sources={streamResult.sources}
        activeSourceIndex={activeSourceIndex}
        onSelectSource={setActiveSourceIndex}
      />

      {/* Title & Metadata Strip */}
      <div className="mt-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-zinc-800">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {movie.rating !== undefined && movie.rating > 0 && (
              <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 font-bold text-amber-400 border border-amber-500/30">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                {formatRating(movie.rating)}
              </span>
            )}
            {movie.year && (
              <span className="flex items-center gap-1 text-zinc-400">
                <Calendar className="h-3.5 w-3.5" />
                {movie.year}
              </span>
            )}
            {movie.runtime && (
              <span className="flex items-center gap-1 text-zinc-400">
                <Clock className="h-3.5 w-3.5" />
                {formatRuntime(movie.runtime)}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {movie.title}
          </h1>

          <p className="text-sm text-zinc-300 leading-relaxed">
            {movie.overview}
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => toggleWatchlist(movie)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
              isBookmarked
                ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {isBookmarked ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span>{isBookmarked ? "In My List" : "Add to Watchlist"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
