"use client";

import React, { useState } from "react";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { MediaCard } from "@/components/common/MediaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchSkeleton } from "@/components/common/Skeleton";
import { Bookmark, Info, Trash2 } from "lucide-react";

export function WatchlistClient() {
  const { watchlist, isLoaded, clearWatchlist } = useWatchlist();
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-48 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-4 w-72 rounded bg-zinc-900 animate-pulse" />
        </div>
        <SearchSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <Bookmark className="h-4 w-4 fill-amber-500" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              My List
            </h1>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-zinc-300">
              {watchlist.length} {watchlist.length === 1 ? "title" : "titles"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Info className="h-3.5 w-3.5 text-zinc-500" />
            <span>Saved securely on this browser for private, instant access.</span>
          </div>
        </div>

        {watchlist.length > 0 && (
          <div>
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Clear all?</span>
                <button
                  type="button"
                  onClick={() => {
                    clearWatchlist();
                    setConfirmClear(false);
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition-colors"
                >
                  Yes, Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                title="Clear entire watchlist"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear List</span>
              </button>
            )}
          </div>
        )}
      </div>

      {watchlist.length === 0 ? (
        <EmptyState
          title="Your Watchlist is Empty"
          message="Save movies and TV shows you want to watch later by clicking the '+ Add to List' button on any title."
          actionText="Discover Trending Titles"
          actionHref="/"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {watchlist.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
