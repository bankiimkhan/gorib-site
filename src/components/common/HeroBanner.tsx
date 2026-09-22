"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Info, Star, Plus, Check } from "lucide-react";
import { MediaItem } from "@/types/media";
import { formatRating, formatRuntime } from "@/lib/utils/formatters";
import { useWatchlist } from "@/lib/hooks/useWatchlist";

interface HeroBannerProps {
  item: MediaItem;
}

export function HeroBanner({ item }: HeroBannerProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const inList = isInWatchlist(item.id);

  const watchUrl = item.type === "tv" ? `/watch/tv/${item.tmdbId}` : `/watch/movie/${item.tmdbId}`;
  const detailUrl = item.type === "tv" ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;

  return (
    <div className="relative h-[75vh] min-h-[550px] max-h-[850px] w-full overflow-hidden bg-black">
      {/* Backdrop Image */}
      {item.backdropUrl && (
        <div className="absolute inset-0">
          <Image
            src={item.backdropUrl}
            alt={item.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-60"
          />
        </div>
      )}

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/70 to-transparent" />

      {/* Hero Content */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="max-w-2xl space-y-4">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            {item.rating !== undefined && item.rating > 0 && (
              <div className="flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                <span>{formatRating(item.rating)} TMDB</span>
              </div>
            )}
            {item.year && (
              <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-zinc-300">
                {item.year}
              </span>
            )}
            {item.runtime && (
              <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-zinc-300">
                {formatRuntime(item.runtime)}
              </span>
            )}
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-amber-400 border border-amber-500/20">
              {item.type === "tv" ? "TV Series" : "Feature Film"}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md">
            {item.title}
          </h1>

          {/* Genres */}
          {item.genres && item.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
              {item.genres.slice(0, 3).map((g) => (
                <span key={g.id} className="text-zinc-300">
                  {g.name}
                  <span className="ml-2 text-zinc-600 last:hidden">•</span>
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          <p className="text-sm sm:text-base text-zinc-300 line-clamp-3 leading-relaxed drop-shadow">
            {item.overview}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={watchUrl}
              className="flex items-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/25 hover:bg-amber-400 hover:scale-105 transition-all"
            >
              <Play className="h-4 w-4 fill-black" />
              <span>Watch Now</span>
            </Link>

            <Link
              href={detailUrl}
              className="flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-zinc-700/80 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors backdrop-blur-md"
            >
              <Info className="h-4 w-4 text-zinc-300" />
              <span>Details</span>
            </Link>

            <button
              type="button"
              onClick={() => toggleWatchlist(item)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                inList
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:text-white hover:bg-zinc-900"
              }`}
            >
              {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span className="hidden sm:inline">{inList ? "In My List" : "Add to List"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

