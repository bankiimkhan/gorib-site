"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, Play, Bookmark, Film } from "lucide-react";
import { MediaItem } from "@/types/media";
import { formatRating } from "@/lib/utils/formatters";
import { useWatchlist } from "@/lib/hooks/useWatchlist";

interface MediaCardProps {
  item: MediaItem;
  priority?: boolean;
}

export function MediaCard({ item, priority = false }: MediaCardProps) {
  const [imageError, setImageError] = useState(false);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isBookmarked = isInWatchlist(item.id);

  const detailUrl = item.type === "tv" ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;
  const watchUrl = item.type === "tv" ? `/watch/tv/${item.tmdbId}` : `/watch/movie/${item.tmdbId}`;

  return (
    <div className="group relative flex flex-col transition-all duration-300">
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 shadow-md ring-1 ring-white/5 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-amber-500/10 group-hover:ring-amber-500/50">
        <Link href={detailUrl} className="absolute inset-0 z-10" aria-label={`View details for ${item.title}`}>
          {item.posterUrl && !imageError ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              priority={priority}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 p-4 text-center">
              <Film className="h-8 w-8 text-zinc-600 mb-2" />
              <span className="text-xs font-semibold text-zinc-400 line-clamp-3">{item.title}</span>
            </div>
          )}
        </Link>

        {/* Rating Badge */}
        {item.rating !== undefined && item.rating > 0 && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-amber-400 backdrop-blur-md">
            <Star className="h-3 w-3 fill-amber-400" />
            <span>{formatRating(item.rating)}</span>
          </div>
        )}

        {/* Media Type Badge */}
        <div className="absolute top-2 right-2 z-20 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-md">
          {item.type}
        </div>

        {/* Hover Quick Actions Overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={watchUrl}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-md"
              aria-label={`Play ${item.title}`}
            >
              <Play className="h-3.5 w-3.5 fill-black" />
              <span>Watch</span>
            </Link>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWatchlist(item);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                isBookmarked
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                  : "border-zinc-700 bg-black/60 text-white hover:bg-zinc-800"
              }`}
              title={isBookmarked ? "Remove from My List" : "Add to My List"}
              aria-label={isBookmarked ? "Remove from My List" : "Add to My List"}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-amber-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Info Title & Year */}
      <div className="mt-2.5 space-y-0.5 px-0.5">
        <Link href={detailUrl} className="focus:outline-none">
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
            {item.title}
          </h3>
        </Link>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{item.year || "N/A"}</span>
          {item.genres && item.genres.length > 0 && (
            <>
              <span>•</span>
              <span className="line-clamp-1">{item.genres[0].name}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

