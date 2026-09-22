import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { discoverMovies } from "@/lib/api/tmdb/client";
import { MOVIE_GENRES } from "@/lib/api/tmdb/genres";
import { MediaCard } from "@/components/common/MediaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { AdSlot } from "@/components/ads/AdSlot";
import { Filter, SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "Movies Catalog",
  description: "Browse and discover movies by genre, release year, rating, and popularity.",
};

interface MoviesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
  const resolvedParams = await searchParams;

  const genreId = resolvedParams.genre ? parseInt(String(resolvedParams.genre), 10) : undefined;
  const year = resolvedParams.year ? parseInt(String(resolvedParams.year), 10) : undefined;
  const sortBy = (resolvedParams.sort as any) || "popularity.desc";
  const page = resolvedParams.page ? parseInt(String(resolvedParams.page), 10) : 1;

  const result = await discoverMovies({
    genreId,
    year,
    sortBy,
    page,
  });

  const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Page Heading */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Explore Movies
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Browse through blockbuster hits, indie gems, and timeless classics.
          </p>
        </div>

        {/* Filter / Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300">
            <span>Year:</span>
            <Link
              href={`/movies?${genreId ? `genre=${genreId}&` : ""}sort=${sortBy}`}
              className={`px-1.5 py-0.5 rounded ${!year ? "text-amber-400 font-bold" : "hover:text-white"}`}
            >
              All
            </Link>
            {years.slice(0, 4).map((y) => (
              <Link
                key={y}
                href={`/movies?year=${y}${genreId ? `&genre=${genreId}` : ""}&sort=${sortBy}`}
                className={`px-1.5 py-0.5 rounded ${year === y ? "text-amber-400 font-bold bg-amber-500/10" : "hover:text-white"}`}
              >
                {y}
              </Link>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300">
            <SlidersHorizontal className="h-3.5 w-3.5 text-amber-500" />
            <Link
              href={`/movies?sort=popularity.desc${genreId ? `&genre=${genreId}` : ""}${year ? `&year=${year}` : ""}`}
              className={`px-1.5 py-0.5 rounded ${sortBy === "popularity.desc" ? "text-amber-400 font-bold" : "hover:text-white"}`}
            >
              Popular
            </Link>
            <Link
              href={`/movies?sort=vote_average.desc${genreId ? `&genre=${genreId}` : ""}${year ? `&year=${year}` : ""}`}
              className={`px-1.5 py-0.5 rounded ${sortBy === "vote_average.desc" ? "text-amber-400 font-bold" : "hover:text-white"}`}
            >
              Top Rated
            </Link>
            <Link
              href={`/movies?sort=primary_release_date.desc${genreId ? `&genre=${genreId}` : ""}${year ? `&year=${year}` : ""}`}
              className={`px-1.5 py-0.5 rounded ${sortBy === "primary_release_date.desc" ? "text-amber-400 font-bold" : "hover:text-white"}`}
            >
              Newest
            </Link>
          </div>
        </div>
      </div>

      {/* Genre Pills */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        <Link
          href={`/movies?sort=${sortBy}${year ? `&year=${year}` : ""}`}
          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            !genreId
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
          }`}
        >
          All Genres
        </Link>
        {MOVIE_GENRES.map((g) => (
          <Link
            key={g.id}
            href={`/movies?genre=${g.id}&sort=${sortBy}${year ? `&year=${year}` : ""}`}
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

      {/* Movie Grid */}
      {result.items.length === 0 ? (
        <EmptyState
          title="No movies found"
          message="Try selecting a different genre or clearing your filters."
          actionText="Clear Filters"
          actionHref="/movies"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {result.items.map((movie) => (
            <MediaCard key={movie.id} item={movie} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {result.totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4">
          {page > 1 && (
            <Link
              href={`/movies?page=${page - 1}${genreId ? `&genre=${genreId}` : ""}${year ? `&year=${year}` : ""}&sort=${sortBy}`}
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
              href={`/movies?page=${page + 1}${genreId ? `&genre=${genreId}` : ""}${year ? `&year=${year}` : ""}&sort=${sortBy}`}
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

