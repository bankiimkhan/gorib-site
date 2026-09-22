import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { discoverTV } from "@/lib/api/tmdb/client";
import { TV_GENRES } from "@/lib/api/tmdb/genres";
import { MediaCard } from "@/components/common/MediaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { AdSlot } from "@/components/ads/AdSlot";
import { SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "TV Shows Catalog",
  description: "Explore trending drama, comedy, fantasy, and documentary television series.",
};

interface TVPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TVPage({ searchParams }: TVPageProps) {
  const resolvedParams = await searchParams;

  const genreId = resolvedParams.genre ? parseInt(String(resolvedParams.genre), 10) : undefined;
  const year = resolvedParams.year ? parseInt(String(resolvedParams.year), 10) : undefined;
  const sortBy = (resolvedParams.sort as any) || "popularity.desc";
  const page = resolvedParams.page ? parseInt(String(resolvedParams.page), 10) : 1;

  const result = await discoverTV({
    genreId,
    year,
    sortBy,
    page,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Television Series
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Stream acclaimed series, new season premieres, and classic shows.
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300">
          <SlidersHorizontal className="h-3.5 w-3.5 text-amber-500" />
          <Link
            href={`/tv?sort=popularity.desc${genreId ? `&genre=${genreId}` : ""}`}
            className={`px-1.5 py-0.5 rounded ${sortBy === "popularity.desc" ? "text-amber-400 font-bold" : "hover:text-white"}`}
          >
            Popular
          </Link>
          <Link
            href={`/tv?sort=vote_average.desc${genreId ? `&genre=${genreId}` : ""}`}
            className={`px-1.5 py-0.5 rounded ${sortBy === "vote_average.desc" ? "text-amber-400 font-bold" : "hover:text-white"}`}
          >
            Top Rated
          </Link>
        </div>
      </div>

      {/* Genre Pills */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        <Link
          href={`/tv?sort=${sortBy}`}
          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            !genreId
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
          }`}
        >
          All Genres
        </Link>
        {TV_GENRES.map((g) => (
          <Link
            key={g.id}
            href={`/tv?genre=${g.id}&sort=${sortBy}`}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              genreId === g.id
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      <AdSlot placement="home-top" />

      {/* TV Grid */}
      {result.items.length === 0 ? (
        <EmptyState
          title="No TV shows found"
          message="Try selecting a different genre or clearing your filters."
          actionText="Clear Filters"
          actionHref="/tv"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {result.items.map((tv) => (
            <MediaCard key={tv.id} item={tv} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={`/tv?page=${page - 1}${genreId ? `&genre=${genreId}` : ""}&sort=${sortBy}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Previous Page
            </Link>
          )}
          <span className="text-xs text-zinc-500">
            Page {page} of {result.totalPages}
          </span>
          {page < result.totalPages && (
            <Link
              href={`/tv?page=${page + 1}${genreId ? `&genre=${genreId}` : ""}&sort=${sortBy}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Next Page
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

