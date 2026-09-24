"use client";

import React, { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { MediaCard } from "@/components/common/MediaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PosterGridSkeleton, Skeleton } from "@/components/common/Skeleton";

export function WatchlistClient() {
  const { watchlist, isLoaded, clearWatchlist } = useWatchlist();
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isLoaded) {
    return (
      <div className="shell pb-16 pt-24 sm:pt-28" aria-busy="true">
        <Skeleton className="mb-8 h-9 w-40" />
        <PosterGridSkeleton count={12} />
      </div>
    );
  }

  return (
    <div className="shell pb-16 pt-24 sm:pt-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">My List</h1>
          <p className="mt-1.5 text-sm text-fg-muted">
            {watchlist.length > 0
              ? `${watchlist.length} ${watchlist.length === 1 ? "title" : "titles"} · saved on this device`
              : "Saved on this device"}
          </p>
        </div>

        {watchlist.length > 0 &&
          (confirmClear ? (
            <div className="flex items-center gap-2" role="group" aria-label="Confirm clearing My List">
              <span className="text-sm text-fg-muted">Remove all titles?</span>
              <button
                type="button"
                onClick={() => {
                  clearWatchlist();
                  setConfirmClear(false);
                }}
                className="btn btn-accent btn-sm"
              >
                Clear list
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="btn btn-ghost btn-sm">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear list
            </button>
          ))}
      </div>

      {watchlist.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Your list is empty"
          message="Tap the + on any movie or show to save it here for later."
          actionText="Find something to watch"
          actionHref="/"
        />
      ) : (
        <div className="poster-grid">
          {watchlist.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
