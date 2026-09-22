"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, X, Clock } from "lucide-react";
import { useContinueWatching } from "@/lib/hooks/useContinueWatching";
import { formatPlayerTime } from "@/lib/utils/formatters";

export function ContinueWatchingRow() {
  const { continueWatchingList, isLoaded, removeProgress } = useContinueWatching();

  if (!isLoaded || continueWatchingList.length === 0) {
    return null;
  }

  return (
    <section className="relative my-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Continue Watching
          </h2>
        </div>
      </div>

      <div className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-4">
        {continueWatchingList.map((item) => {
          const watchUrl =
            item.type === "tv"
              ? `/watch/tv/${item.tmdbId}?season=${item.season || 1}&episode=${item.episode || 1}`
              : `/watch/movie/${item.tmdbId}`;

          const displayTitle =
            item.type === "tv" && item.season && item.episode
              ? `${item.title} (S${item.season}:E${item.episode})`
              : item.title;

          return (
            <div
              key={item.id}
              className="group relative w-60 sm:w-72 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 transition-all hover:border-amber-500/50"
            >
              <Link href={watchUrl} className="block relative aspect-video w-full bg-zinc-950">
                {item.backdropUrl || item.posterUrl ? (
                  <Image
                    src={item.backdropUrl || item.posterUrl!}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 240px, 288px"
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-500">
                    No preview
                  </div>
                )}

                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg">
                    <Play className="h-5 w-5 fill-black ml-0.5" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
              </Link>

              {/* Card Meta & Remove */}
              <div className="flex items-center justify-between p-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-zinc-200 truncate">
                    {displayTitle}
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    {formatPlayerTime(item.currentTime)} / {formatPlayerTime(item.duration)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeProgress(item.tmdbId, item.season, item.episode);
                  }}
                  className="ml-2 rounded-full p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                  title="Remove from history"
                  aria-label="Remove from continue watching history"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

