"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Star, Film } from "lucide-react";
import { MediaItem } from "@/types/media";
import { formatRating } from "@/lib/utils/formatters";
import { getLanguageDisplayName } from "@/lib/utils/languages";
import { mediaHref, watchHref } from "@/lib/utils/routes";
import { WatchlistButton } from "./WatchlistButton";

interface MediaCardProps {
  item: MediaItem;
  priority?: boolean;
  /** Responsive `sizes` hint; defaults to a rail/grid poster width. */
  sizes?: string;
}

/** Non-English originals get a small corner tag (e.g. "Bengali", "Korean"). */
function languageTag(item: MediaItem): string | undefined {
  const lang = item.originalLanguage;
  if (!lang || lang === "en" || lang === "xx") return undefined;
  const name = getLanguageDisplayName(lang, "");
  return name && name.length <= 12 ? name : undefined;
}

/**
 * Poster card. Touch devices get a clean tap-to-open poster; mouse users get
 * a subtle lift with Play and My List actions revealed on hover.
 */
export const MediaCard = memo(function MediaCard({
  item,
  priority = false,
  sizes = "(max-width: 640px) 31vw, (max-width: 1024px) 20vw, (max-width: 1536px) 15vw, 12vw",
}: MediaCardProps) {
  const [imageError, setImageError] = useState(false);
  const tag = languageTag(item);
  const hasRating = item.rating !== undefined && item.rating > 0;

  return (
    <article className="group/card relative">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-surface shadow-black/60 transition-[transform,box-shadow] duration-300 ease-out-soft pointer-fine:group-hover/card:scale-[1.04] pointer-fine:group-hover/card:shadow-card motion-reduce:transform-none">
        <Link href={mediaHref(item)} className="absolute inset-0 z-10 rounded-md" aria-label={item.title}>
          {item.posterUrl && !imageError ? (
            <Image
              src={item.posterUrl}
              alt=""
              fill
              sizes={sizes}
              priority={priority}
              onError={() => setImageError(true)}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-2 to-surface p-3 text-center">
              <Film className="h-7 w-7 text-fg-subtle" aria-hidden="true" />
              <span className="line-clamp-3 text-xs font-semibold text-fg-muted">{item.title}</span>
            </div>
          )}
        </Link>

        {tag && (
          <span className="pointer-events-none absolute left-0 top-0 z-20 rounded-br-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {tag}
          </span>
        )}

        {/* Hover actions (mouse only) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden translate-y-2 items-center gap-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2.5 pt-10 opacity-0 transition-[opacity,transform] duration-200 pointer-fine:flex pointer-fine:group-hover/card:translate-y-0 pointer-fine:group-hover/card:opacity-100 pointer-fine:group-focus-within/card:translate-y-0 pointer-fine:group-focus-within/card:opacity-100">
          <Link
            href={watchHref(item)}
            className="pointer-events-auto flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-110"
            aria-label={`Play ${item.title}`}
          >
            <Play className="ml-0.5 h-4 w-4 fill-black" aria-hidden="true" />
          </Link>
          <WatchlistButton item={item} className="pointer-events-auto h-9 w-9 [&_svg]:h-4 [&_svg]:w-4" />
        </div>
      </div>

      <Link href={mediaHref(item)} tabIndex={-1} className="mt-2 block px-0.5">
        <h3 className="line-clamp-1 text-[13px] font-medium text-fg transition-colors pointer-fine:group-hover/card:text-white sm:text-sm">
          {item.title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
          {item.year && <span>{item.year}</span>}
          {item.type === "tv" && <span className="font-semibold text-fg-muted">Series</span>}
          {hasRating && (
            <span className="ml-auto flex flex-shrink-0 items-center gap-0.5 font-semibold text-rating">
              <Star className="h-3 w-3 fill-rating" aria-hidden="true" />
              <span className="sr-only">Rated</span>
              {formatRating(item.rating)}
            </span>
          )}
        </p>
      </Link>
    </article>
  );
});
