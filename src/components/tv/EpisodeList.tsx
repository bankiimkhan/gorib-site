"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Clock, Star } from "lucide-react";
import { Episode } from "@/types/media";
import { formatRuntime, formatRating } from "@/lib/utils/formatters";

interface EpisodeListProps {
  tvId: number;
  episodes: Episode[];
  activeEpisode?: number;
}

export function EpisodeList({ tvId, episodes, activeEpisode }: EpisodeListProps) {
  if (!episodes || episodes.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">
        No episode information available for this season.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
      {episodes.map((ep) => {
        const isCurrent = activeEpisode === ep.episodeNumber;
        const watchUrl = `/watch/tv/${tvId}?season=${ep.seasonNumber}&episode=${ep.episodeNumber}`;

        return (
          <div
            key={ep.id}
            className={`group relative flex flex-col sm:flex-row gap-4 overflow-hidden rounded-2xl p-3 border transition-all ${
              isCurrent
                ? "border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/5"
                : "border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700"
            }`}
          >
            {/* Episode Still */}
            <div className="relative aspect-video sm:w-48 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-950">
              {ep.stillUrl ? (
                <Image
                  src={ep.stillUrl}
                  alt={ep.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 192px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600 text-xs">
                  No still
                </div>
              )}

              {/* Play Overlay */}
              <Link
                href={watchUrl}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Play Episode ${ep.episodeNumber}: ${ep.title}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-black shadow-md">
                  <Play className="h-4 w-4 fill-black ml-0.5" />
                </div>
              </Link>

              {/* Episode Number Badge */}
              <div className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                EP {ep.episodeNumber}
              </div>
            </div>

            {/* Episode Details */}
            <div className="flex flex-1 flex-col justify-between py-1">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                    {ep.episodeNumber}. {ep.title}
                  </h4>
                  {Boolean(ep.voteAverage && ep.voteAverage > 0) && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" />
                      {formatRating(ep.voteAverage)}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                  {ep.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      {formatRuntime(ep.runtime)}
                    </span>
                  )}
                  {ep.airDate && <span>• {ep.airDate}</span>}
                </div>

                <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {ep.overview}
                </p>
              </div>

              <div className="mt-3">
                <Link
                  href={watchUrl}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-amber-500 hover:text-black transition-colors"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Play Episode</span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

