"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, X } from "lucide-react";
import { useContinueWatching } from "@/lib/hooks/useContinueWatching";
import { formatPlayerTime } from "@/lib/utils/formatters";
import { episodeHref } from "@/lib/utils/routes";
import { Rail } from "./Rail";

export function ContinueWatchingRow() {
  const { continueWatchingList, isLoaded, removeProgress } = useContinueWatching();

  if (!isLoaded || continueWatchingList.length === 0) {
    return null;
  }

  return (
    <Rail title="Continue Watching">
      {continueWatchingList.map((item) => {
        const isEpisode = item.type === "tv" && item.season && item.episode;
        const href =
          item.type === "tv"
            ? episodeHref(item.tmdbId, item.season || 1, item.episode || 1)
            : `/watch/movie/${item.tmdbId}`;
        const image = item.backdropUrl || item.posterUrl;
        const remaining = item.duration > 0 ? Math.max(0, item.duration - item.currentTime) : 0;

        return (
          <li
            key={item.id}
            className="group/cw w-[64vw] max-w-[360px] flex-shrink-0 snap-start sm:w-[40vw] md:w-[30vw] lg:w-[24vw] xl:w-[19vw]"
          >
            <div className="relative aspect-video overflow-hidden rounded-md bg-surface transition-transform duration-300 ease-out-soft pointer-fine:group-hover/cw:scale-[1.03]">
              <Link href={href} className="absolute inset-0 rounded-md" aria-label={`Resume ${item.title}`}>
                {image ? (
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 64vw, (max-width: 1024px) 30vw, 360px"
                    className="object-cover"
                  />
                ) : null}
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/80 bg-black/50 text-white backdrop-blur-sm transition-transform group-hover/cw:scale-110">
                    <Play className="ml-0.5 h-5 w-5 fill-white" aria-hidden="true" />
                  </span>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => removeProgress(item.tmdbId, item.season, item.episode)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur-sm transition-[opacity,color] hover:text-white pointer-fine:opacity-0 pointer-fine:group-hover/cw:opacity-100 pointer-fine:focus-visible:opacity-100"
                aria-label={`Remove ${item.title} from Continue Watching`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
                <div className="h-full bg-accent" style={{ width: `${Math.max(3, item.progressPercent)}%` }} />
              </div>
            </div>

            <div className="mt-2 px-0.5">
              <p className="truncate text-sm font-medium text-fg">{item.title}</p>
              <p className="text-xs text-fg-subtle">
                {isEpisode ? `S${item.season}:E${item.episode}` : "Movie"}
                {remaining > 60 ? ` · ${formatPlayerTime(remaining)} left` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </Rail>
  );
}
