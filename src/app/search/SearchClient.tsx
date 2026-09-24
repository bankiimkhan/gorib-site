"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2, Clock, SearchX, WifiOff } from "lucide-react";
import { MediaItem } from "@/types/media";
import { MediaCard } from "@/components/common/MediaCard";
import { PosterGridSkeleton } from "@/components/common/Skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { AdSlot } from "@/components/ads/AdSlot";
import { NativeAdCard } from "@/components/ads/NativeAdCard";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  clearRecentSearches,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  saveRecentSearch,
  subscribeRecentSearches,
} from "@/lib/utils/recentSearches";

const BROWSE_LINKS = [
  { label: "Action", href: "/genre/action" },
  { label: "Comedy", href: "/genre/comedy" },
  { label: "Drama", href: "/genre/drama" },
  { label: "Thriller", href: "/genre/thriller" },
  { label: "Sci-Fi", href: "/genre/sci-fi" },
  { label: "Animation", href: "/genre/animation" },
  { label: "Horror", href: "/genre/horror" },
  { label: "Romance", href: "/genre/romance" },
  { label: "Bangla Cinema", href: "/movies?language=bn" },
  { label: "Bollywood", href: "/movies?language=hi" },
  { label: "South Indian", href: "/movies?language=south" },
  { label: "K-Drama", href: "/tv?language=ko&genre=18" },
  { label: "Anime", href: "/tv?language=ja&genre=16" },
];

const TYPE_TABS = [
  { id: "multi", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Shows" },
] as const;

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
    page: number;
    totalPages: number;
    totalResults: number;
    failed?: boolean;
  }>({
    query: "",
    type: "multi",
    results: [],
    page: 1,
    totalPages: 0,
    totalResults: 0,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot
  );
  const [retryKey, setRetryKey] = useState(0);

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
            page: data.page || 1,
            totalPages: data.totalPages || 0,
            totalResults: data.totalResults || 0,
          });
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (isMounted) {
          setSearchState({
            query: trimmedQuery,
            type: filterType,
            results: [],
            page: 1,
            totalPages: 0,
            totalResults: 0,
            failed: true,
          });
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [trimmedQuery, filterType, retryKey]);

  const canLoadMore = !isLoading && searchState.page < searchState.totalPages;

  const loadMore = async () => {
    if (loadingMore || !canLoadMore) return;
    setLoadingMore(true);
    const nextPage = searchState.page + 1;
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchState.query)}&type=${searchState.type}&page=${nextPage}`
      );
      if (!res.ok) throw new Error("Search request failed");
      const data = await res.json();
      setSearchState((prev) => {
        // Ignore if the query changed while this page was loading.
        if (prev.query !== searchState.query || prev.type !== searchState.type) return prev;
        const seen = new Set(prev.results.map((r) => r.id));
        return {
          ...prev,
          results: [...prev.results, ...((data.items || []) as MediaItem[]).filter((r) => !seen.has(r.id))],
          page: data.page || nextPage,
          totalPages: data.totalPages || prev.totalPages,
        };
      });
    } catch {
      // Keep existing results; the button stays available to retry.
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="shell pb-16 pt-24 sm:pt-28">
      <h1 className="sr-only">Search</h1>

      <form
        role="search"
        className="mx-auto max-w-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (inputVal.trim()) saveRecentSearch(inputVal.trim());
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search titles, people, genres"
            aria-label="Search movies and TV shows"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            autoFocus
            className="input h-14 pl-12 pr-12 text-base sm:text-lg [&::-webkit-search-cancel-button]:hidden"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => setInputVal("")}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted transition-colors hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label="Result type">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              aria-pressed={filterType === tab.id}
              className="chip h-9 px-4 text-sm"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </form>

      <AdSlot placement="search-banner" />

      <div className="mt-6" aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <PosterGridSkeleton count={16} />
        ) : hasSearched && searchState.failed ? (
          <EmptyState
            icon={WifiOff}
            title="Search is temporarily unavailable"
            message="We couldn't reach the catalog. Check your connection and try again."
            actionText="Retry"
            onAction={() => {
              setSearchState((prev) => ({ ...prev, query: "", failed: false }));
              setRetryKey((k) => k + 1);
            }}
          />
        ) : hasSearched && results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={`No results for “${trimmedQuery}”`}
            message="Check the spelling, or try a different title, actor or genre."
            actionText="Clear search"
            onAction={() => setInputVal("")}
          />
        ) : hasSearched && results.length > 0 ? (
          <div>
            <p className="mb-5 text-sm text-fg-muted">
              <span className="font-semibold text-white">{searchState.totalResults.toLocaleString("en-US")}</span>{" "}
              results for “{trimmedQuery}”
            </p>
            {/* Remember the query once the viewer opens one of its results. */}
            <div
              className="poster-grid"
              onClickCapture={(e) => {
                if ((e.target as HTMLElement).closest("a")) saveRecentSearch(trimmedQuery);
              }}
            >
              {results.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index === 12 && <NativeAdCard key="search-sponsor" />}
                  <MediaCard item={item} priority={index < 6} />
                </React.Fragment>
              ))}
            </div>
            {canLoadMore && (
              <div className="mt-12 flex justify-center">
                <button type="button" onClick={loadMore} disabled={loadingMore} className="btn btn-secondary">
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {loadingMore ? "Loading…" : "Show more results"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-10 py-6">
            {recent.length > 0 && (
              <section aria-labelledby="recent-heading">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id="recent-heading" className="section-title text-base sm:text-lg">
                    Recent searches
                  </h2>
                  <button type="button" onClick={clearRecentSearches} className="btn btn-ghost btn-sm">
                    Clear
                  </button>
                </div>
                <ul className="divide-y divide-line">
                  {recent.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => setInputVal(q)}
                        className="flex w-full items-center gap-3 rounded px-1 py-3 text-left text-sm text-fg-muted transition-colors hover:text-white"
                      >
                        <Clock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="browse-heading">
              <h2 id="browse-heading" className="section-title mb-4 text-base sm:text-lg">
                Browse by category
              </h2>
              <div className="flex flex-wrap gap-2">
                {BROWSE_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="chip h-9 px-4 text-sm">
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
