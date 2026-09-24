import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { Episode } from "@/types/media";
import { formatRuntime } from "@/lib/utils/formatters";
import { episodeHref } from "@/lib/utils/routes";

interface EpisodeListProps {
  tvId: number;
  episodes: Episode[];
  /** Episode to highlight (last watched, or the one playing). */
  activeEpisode?: number;
  activeLabel?: string;
}

export function EpisodeList({ tvId, episodes, activeEpisode, activeLabel = "Continue watching" }: EpisodeListProps) {
  if (!episodes || episodes.length === 0) {
    return <p className="py-8 text-center text-sm text-fg-subtle">No episode information available for this season.</p>;
  }

  return (
    <ol className="mt-4 divide-y divide-line border-y border-line">
      {episodes.map((ep) => {
        const isCurrent = activeEpisode === ep.episodeNumber;

        return (
          <li key={ep.id}>
            <Link
              href={episodeHref(tvId, ep.seasonNumber, ep.episodeNumber)}
              aria-current={isCurrent ? "true" : undefined}
              className={`group flex items-start gap-3 rounded-md px-2 py-4 transition-colors sm:items-center sm:gap-5 sm:px-4 sm:py-5 ${
                isCurrent ? "bg-surface" : "hover:bg-surface/70"
              }`}
            >
              <span className="hidden w-8 flex-shrink-0 text-center text-2xl font-semibold tabular-nums text-fg-subtle sm:block">
                {ep.episodeNumber}
              </span>

              <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded bg-surface-2 sm:w-40 md:w-48">
                {ep.stillUrl ? (
                  <Image
                    src={ep.stillUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 128px, 192px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-fg-subtle">
                    Episode {ep.episodeNumber}
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-black/50">
                    <Play className="ml-0.5 h-4 w-4 fill-white text-white" aria-hidden="true" />
                  </span>
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="line-clamp-2 text-sm font-semibold text-fg sm:text-base">
                    <span className="sm:hidden">{ep.episodeNumber}. </span>
                    {ep.title}
                  </h3>
                  {ep.runtime ? (
                    <span className="flex-shrink-0 text-xs text-fg-subtle sm:text-sm">{formatRuntime(ep.runtime)}</span>
                  ) : null}
                </div>
                {isCurrent && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">{activeLabel}</p>
                )}
                {ep.overview && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg-muted sm:line-clamp-3 sm:text-sm">
                    {ep.overview}
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
