"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Film, Tv, Layers, X } from "lucide-react";
import { MediaItem } from "@/types/media";
import { MediaCard } from "@/components/common/MediaCard";
import { SearchSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { useDebounce } from "@/lib/hooks/useDebounce";
export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const [inputVal, setInputVal] = useState(urlQuery);
  const debouncedQuery = useDebounce(inputVal, 400);

  const [filterType, setFilterType] = useState<"multi" | "movie" | "tv">("multi");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(urlQuery));

  // Sync state if URL query changes externally (e.g. from header search)
  useEffect(() => {
    setInputVal(urlQuery);
    if (urlQuery) {
      setHasSearched(true);
    }
  }, [urlQuery]);

  // Sync URL when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      router.replace(`/search?q=${encodeURIComponent(debouncedQuery.trim())}`, {
        scroll: false,
      });
    } else {
      router.replace("/search", { scroll: false });
    }
  }, [debouncedQuery, router]);

  // Execute search via server-side /api/search route
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    setIsLoading(true);
    setHasSearched(true);

    fetch(
      `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&type=${filterType}`,
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Search request failed");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setResults(data.items || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Search error:", err);
        if (isMounted) {
          setResults([]);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [debouncedQuery, filterType]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Search Input Bar */}
      <div className="relative mx-auto max-w-3xl">
        <div className="relative flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
          <input
            type="text"
            placeholder="Search by title, character, director, or keyword..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            autoFocus
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 py-4 pl-12 pr-12 text-base text-white placeholder-zinc-500 shadow-2xl focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => setInputVal("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:text-white"
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

      {/* Results View */}
      <div className="mt-10">
        {isLoading ? (
          <SearchSkeleton />
        ) : hasSearched && results.length === 0 ? (
          <EmptyState
            title={`No results found for "${debouncedQuery}"`}
            message="Check the spelling or try searching for another movie, TV series, or actor."
          />
        ) : (
          <div>
            {hasSearched && (
              <div className="mb-4 text-xs font-medium text-zinc-400">
                Found <span className="font-bold text-white">{results.length}</span> titles for &quot;{debouncedQuery}&quot;
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

