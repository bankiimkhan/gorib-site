"use client";

import React from "react";
import Link from "next/link";
import { Play, Bookmark, Check, Video } from "lucide-react";
import { MediaItem } from "@/types/media";
import { useWatchlist } from "@/lib/hooks/useWatchlist";

interface MovieHeroActionsProps {
  movie: MediaItem;
}

export function MovieHeroActions({ movie }: MovieHeroActionsProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isBookmarked = isInWatchlist(movie.id);

  return (
    <div className="mt-6 flex flex-col gap-2.5 w-full max-w-xs md:max-w-full">
      {/* Primary Watch Action */}
      <Link
        href={`/watch/movie/${movie.tmdbId}`}
        className="flex items-center justify-center gap-2.5 rounded-xl bg-amber-500 py-3.5 px-6 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <Play className="h-4 w-4 fill-black" />
        <span>Watch Movie</span>
      </Link>

      {/* Secondary Actions Row: Watchlist & Trailer */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleWatchlist(movie)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold border transition-all active:scale-[0.98] ${
            isBookmarked
              ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
              : "border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
          aria-label={isBookmarked ? "Remove movie from watchlist" : "Add movie to watchlist"}
        >
          {isBookmarked ? (
            <>
              <Check className="h-3.5 w-3.5 text-amber-400" />
              <span>In My List</span>
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5" />
              <span>Add to List</span>
            </>
          )}
        </button>

        {movie.trailerUrl && (
          <a
            href={movie.trailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 px-3.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Watch Official Trailer on YouTube"
          >
            <Video className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Trailer</span>
          </a>
        )}
      </div>
    </div>
  );
}

