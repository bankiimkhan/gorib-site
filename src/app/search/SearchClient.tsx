"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Film, Tv, Layers, X, Sparkles } from "lucide-react";
import { MediaItem } from "@/types/media";
import { MediaCard } from "@/components/common/MediaCard";
import { SearchSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { AdSlot } from "@/components/ads/AdSlot";
import { NativeAdCard } from "@/components/ads/NativeAdCard";
import { useDebounce } from "@/lib/hooks/useDebounce";

const SUGGESTED_SEARCHES = [
  "Bangla Cinema",
  "Action Blockbusters",
  "Bollywood Hits",
  "Sci-Fi Thrillers",
  "Crime & Mystery",
  "Comedy Series",
  "South Indian Cinema",
  "Animation",
];

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const [inputVal, setInputVal] = useState(urlQuery);
  const debouncedQuery = useDebounce(inputVal, 350);

  const [filterType, setFilterType] = useState<"multi" | "movie" | "tv">("multi");
  const [searchState, setSearchState] = useState<{
    query: string;
    type: string;
    results: MediaItem[];
  }>({
    query: "",
    type: "multi",
    results: [],
  });

  // Sync state if URL query changes externally (render-time adjustment)
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setInputVal(urlQuery);
  }

  const trimmedQuery = debouncedQuery.trim();
  const hasSearched = Boolean(trimmedQuery);
  const isLoading =
    hasSearched &&
    (trimmedQuery !== searchState.query || filterType !== searchState.type);
  const results = searchState.results;

  // Sync URL when debounced query changes
  useEffect(() => {
    if (trimmedQuery) {
      router.replace(`/search?q=${encodeURIComponent(trimmedQuery)}`, {
        scroll: false,
      });
    } else {
      router.replace("/search", { scroll: false });
    }
  }, [trimmedQuery, router]);

  // Execute search via server-side /api/search route
  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    fetch(
      `/api/search?q=${encodeURIComponent(trimmedQuery)}&type=${filterType}`,
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Search request failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setSearchState({
            query: trimmedQuery,
            type: filterType,
            results: data.items || [],
          });
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Search error:", err);
        if (isMounted) {
          setSearchState({
            query: trimmedQuery,
            type: filterType,
            results: [],
          });
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [trimmedQuery, filterType]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Search Input Bar */}
      <div className="relative mx-auto max-w-3xl">
        <div className="relative flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
          <input
            type="text"
            placeholder="Search by title, genre, actor, or keyword..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            autoFocus
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 py-4 pl-12 pr-12 text-base text-white placeholder-zinc-500 shadow-2xl focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all backdrop-blur-xl"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => setInputVal("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:text-white transition-colors"
              aria-label="Clear search input"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Media Type Filter Tabs */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType("multi")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filterType === "multi"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            All Results
          </button>
          <button
            type="button"
            onClick={() => setFilterType("movie")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filterType === "movie"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            Movies
          </button>
          <button
            type="button"
            onClick={() => setFilterType("tv")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              filterType === "tv"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
            }`}
          >
            <Tv className="h-3.5 w-3.5" />
            TV Shows
          </button>
        </div>
      </div>

      {/* Search Banner Ad Slot */}
      <AdSlot placement="search-banner" />

      {/* Results View */}
      <div className="mt-6">
        {isLoading ? (
          <SearchSkeleton />
        ) : hasSearched && results.length === 0 ? (
          <EmptyState
            title={`No results found for "${debouncedQuery}"`}
            message="Check the spelling or try searching for another movie, TV series, or actor."
            actionText="Clear Search"
            onRetry={() => setInputVal("")}
          />
        ) : hasSearched && results.length > 0 ? (
          <div>
            <div className="mb-4 text-xs font-medium text-zinc-400">
              Found <span className="font-bold text-white">{results.length}</span> titles for &quot;{debouncedQuery}&quot;
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index === 6 && <NativeAdCard key="search-sponsor" />}
                  <MediaCard item={item} />
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          /* Empty Initial State: Suggestions & Discovery */
          <div className="mx-auto max-w-xl py-12 text-center space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mx-auto border border-amber-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Explore the Library</h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
                Search through thousands of movies, TV series, regional cinema, and global broadcasts.
              </p>
            </div>

            <div>
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Suggested Searches
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {SUGGESTED_SEARCHES.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setInputVal(tag)}
                    className="rounded-full bg-zinc-900/90 border border-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
