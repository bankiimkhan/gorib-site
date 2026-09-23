import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { discoverTV } from "@/lib/api/tmdb/client";
import { TV_GENRES } from "@/lib/api/tmdb/genres";
import { MediaCard } from "@/components/common/MediaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { AdSlot } from "@/components/ads/AdSlot";
import { NativeAdCard } from "@/components/ads/NativeAdCard";
import { SlidersHorizontal, X } from "lucide-react";

export const metadata: Metadata = {
  title: "TV Shows Catalog",
  description: "Explore trending drama, comedy, fantasy, and documentary television series.",
};

interface TVPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const REGIONAL_TV_FILTERS = [
  { id: "all", label: "All Series" },
  { id: "bn", label: "Bangla Natok & Serials" },
  { id: "hi", label: "Hindi & Indian Series" },
  { id: "en", label: "International" },
];

export default async function TVPage({ searchParams }: TVPageProps) {
  const resolvedParams = await searchParams;

  const genreId = resolvedParams.genre ? parseInt(String(resolvedParams.genre), 10) : undefined;
  const year = resolvedParams.year ? parseInt(String(resolvedParams.year), 10) : undefined;
  const sortBy = (resolvedParams.sort as string) || "popularity.desc";
  const page = resolvedParams.page ? parseInt(String(resolvedParams.page), 10) : 1;
  const language = resolvedParams.language ? String(resolvedParams.language) : undefined;

  const result = await discoverTV({
    genreId,
    year,
    sortBy: sortBy as "popularity.desc" | "vote_average.desc",
    page,
    language,
  });

  const buildQuery = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const current = {
      language: language && language !== "all" ? language : undefined,
      genre: genreId,
      year,
      sort: sortBy !== "popularity.desc" ? sortBy : undefined,
      ...newParams,
    };
    for (const [k, v] of Object.entries(current)) {
      if (v !== undefined && v !== null && v !== "" && v !== "all") {
        params.set(k, String(v));
      }
    }
    const q = params.toString();
    return q ? `/tv?${q}` : "/tv";
  };

  const activeGenre = TV_GENRES.find((g) => g.id === genreId);
  const activeGenreName = activeGenre?.name;
  const activeLangFilter = REGIONAL_TV_FILTERS.find((f) => f.id === (language || "all"));
  const hasActiveFilters = Boolean(
    (language && language !== "all") || genreId || year || (sortBy && sortBy !== "popularity.desc")
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Television Series
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Stream acclaimed series, new season premieres, regional drama, and classic shows.
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300">
          <SlidersHorizontal className="h-3.5 w-3.5 text-amber-500" />
          <Link
            href={buildQuery({ sort: "popularity.desc", page: 1 })}
            className={`px-2.5 py-0.5 rounded transition-colors ${sortBy === "popularity.desc" ? "text-amber-400 font-bold bg-amber-500/10" : "hover:text-white"}`}
          >
            Popular
          </Link>
          <Link
            href={buildQuery({ sort: "vote_average.desc", page: 1 })}
            className={`px-2.5 py-0.5 rounded transition-colors ${sortBy === "vote_average.desc" ? "text-amber-400 font-bold bg-amber-500/10" : "hover:text-white"}`}
          >
            Top Rated
          </Link>
        </div>
      </div>

      {/* Industry / Language Filter Tabs */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">
          Filter by Industry / Language
        </div>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2">
          {REGIONAL_TV_FILTERS.map((rf) => {
            const isSelected = (!language && rf.id === "all") || language === rf.id;
            return (
              <Link
                key={rf.id}
                href={buildQuery({ language: rf.id === "all" ? undefined : rf.id, page: 1 })}
                className={`flex-shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20 scale-[1.02]"
                    : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                }`}
              >
                {rf.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Genre Pills */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-3 mb-6">
        <Link
          href={buildQuery({ genre: undefined, page: 1 })}
          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            !genreId
              ? "bg-zinc-700 text-white shadow-inner font-bold"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
          }`}
        >
          All Genres
        </Link>
        {TV_GENRES.map((g) => (
          <Link
            key={g.id}
            href={buildQuery({ genre: g.id, page: 1 })}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              genreId === g.id
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 font-bold"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      <AdSlot placement="catalog-header" />

      {/* Active filters status banner */}
      {hasActiveFilters && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500">Active Filters:</span>
            {language && language !== "all" && (
              <Link
                href={buildQuery({ language: undefined, page: 1 })}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-amber-400 hover:bg-amber-500/20 transition-colors"
                title="Remove language filter"
              >
                <span>{activeLangFilter?.label}</span>
                <X className="h-3 w-3" />
              </Link>
            )}
            {activeGenreName && (
              <Link
                href={buildQuery({ genre: undefined, page: 1 })}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-amber-400 hover:bg-amber-500/20 transition-colors"
                title="Remove genre filter"
              >
                <span>Genre: {activeGenreName}</span>
                <X className="h-3 w-3" />
              </Link>
            )}
            {year && (
              <Link
                href={buildQuery({ year: undefined, page: 1 })}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-amber-400 hover:bg-amber-500/20 transition-colors"
                title="Remove year filter"
              >
                <span>Year: {year}</span>
                <X className="h-3 w-3" />
              </Link>
            )}
            {sortBy && sortBy !== "popularity.desc" && (
              <Link
                href={buildQuery({ sort: undefined, page: 1 })}
                className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-700 transition-colors"
                title="Reset sort"
              >
                <span>Sorted by: Top Rated</span>
                <X className="h-3 w-3" />
              </Link>
            )}
          </div>
          <Link
            href="/tv"
            className="text-amber-500 hover:text-amber-400 font-semibold transition-colors"
          >
            Reset All
          </Link>
        </div>
      )}

      {/* TV Grid */}
      {result.items.length === 0 ? (
        <EmptyState
          title="No TV shows found"
          message="Try selecting a different genre, industry, or clearing your filters."
          actionText="Clear Filters"
          actionHref="/tv"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {result.items.map((tv, index) => (
            <React.Fragment key={tv.id}>
              {index === 12 && <NativeAdCard key="in-feed-sponsor" />}
              <MediaCard item={tv} />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={buildQuery({ page: page - 1 })}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors shadow-sm"
            >
              Previous Page
            </Link>
          )}
          <span className="text-xs text-zinc-500 font-medium">
            Page {page} of {result.totalPages}
          </span>
          {page < result.totalPages && (
            <Link
              href={buildQuery({ page: page + 1 })}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition-colors shadow-sm"
            >
              Next Page
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
