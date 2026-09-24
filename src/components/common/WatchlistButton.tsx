"use client";

import React from "react";
import { Check, Plus } from "lucide-react";
import { MediaItem } from "@/types/media";
import { useWatchlist } from "@/lib/hooks/useWatchlist";

/** The fields a saved title needs to render a card; keeps localStorage small. */
function toListEntry(item: MediaItem): MediaItem {
  return {
    id: item.id,
    tmdbId: item.tmdbId,
    type: item.type,
    title: item.title,
    overview: item.overview,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    releaseDate: item.releaseDate,
    year: item.year,
    rating: item.rating,
    genres: item.genres,
    originalLanguage: item.originalLanguage,
  };
}

interface WatchlistButtonProps {
  item: MediaItem;
  /** "icon": round outlined button. "full": labelled secondary button. */
  variant?: "icon" | "full";
  className?: string;
}

/** Single add/remove-from-My-List control used by cards, heroes and detail pages. */
export function WatchlistButton({ item, variant = "icon", className = "" }: WatchlistButtonProps) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const saved = isInWatchlist(item.id);
  const label = saved ? `Remove ${item.title} from My List` : `Add ${item.title} to My List`;
  const Icon = saved ? Check : Plus;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist(toListEntry(item));
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
        className={`btn btn-secondary ${className}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span>My List</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Remove from My List" : "Add to My List"}
      className={`btn-icon ${saved ? "border-white" : ""} ${className}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
