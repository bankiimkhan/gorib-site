"use client";

import React from "react";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { MediaCard } from "@/components/common/MediaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Bookmark, Info } from "lucide-react";

export function WatchlistClient() {
  const { watchlist, isLoaded } = useWatchlist();

  if (!isLoaded) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        Loading your list...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Bookmark className="h-6 w-6 text-amber-500 fill-amber-500/20" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            My List
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Info className="h-3.5 w-3.5 text-zinc-500" />
          <span>Your watchlist is securely stored on this browser for private, instant access.</span>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <EmptyState
          title="Your Watchlist is Empty"
          message="Save movies and TV shows you want to watch later by clicking the '+ My List' button on any title."
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

