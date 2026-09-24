import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getGenreBySlug, getGenreIdsForSlug } from "@/lib/api/tmdb/genres";
import { discoverMovies, discoverTV } from "@/lib/api/tmdb/client";
import { MediaRow } from "@/components/common/MediaRow";
import { AdSlot } from "@/components/ads/AdSlot";
import { EmptyState } from "@/components/common/EmptyState";

interface GenrePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = getGenreBySlug(slug);

  if (!genre) {
    return { title: "Genre Not Found" };
  }

  return {
    title: `${genre.name} Movies & TV Shows`,
    description: `Stream the top rated and most popular ${genre.name.toLowerCase()} movies and series on gorib.lol.`,
  };
}

export default async function GenrePage({ params }: GenrePageProps) {
  const { slug } = await params;
  const genre = getGenreBySlug(slug);

  if (!genre) {
    notFound();
  }

  // Movie and TV genre ids differ on TMDB (e.g. Action 28 vs Action & Adventure 10759).
  const ids = getGenreIdsForSlug(slug);
  const empty = { items: [], page: 1, totalPages: 0, totalResults: 0 };

  const [popularMovies, topMovies, popularTV, topTV] = await Promise.all([
    ids.movie ? discoverMovies({ genreId: ids.movie, sortBy: "popularity.desc" }) : empty,
    ids.movie ? discoverMovies({ genreId: ids.movie, sortBy: "vote_average.desc" }) : empty,
    ids.tv ? discoverTV({ genreId: ids.tv, sortBy: "popularity.desc" }) : empty,
    ids.tv ? discoverTV({ genreId: ids.tv, sortBy: "vote_average.desc" }) : empty,
  ]);

  const hasAny =
    popularMovies.items.length + topMovies.items.length + popularTV.items.length + topTV.items.length > 0;

  return (
    <div className="pb-16 pt-24 sm:pt-28">
      <div className="shell mb-4">
        <p className="eyebrow">Genre</p>
        <h1 className="page-title mt-1">{genre.name}</h1>
        <p className="mt-1.5 text-sm text-fg-muted sm:text-base">
          The most popular and best-rated {genre.name.toLowerCase()} movies and series.
        </p>
      </div>

      {!hasAny && (
        <EmptyState
          title={`Nothing in ${genre.name} right now`}
          message="Browse the full catalog instead."
          actionText="Browse movies"
          actionHref="/movies"
        />
      )}

      {popularMovies.items.length > 0 && (
        <MediaRow
          title={`Popular ${genre.name} Movies`}
          items={popularMovies.items}
          viewAllHref={`/movies?genre=${ids.movie}`}
          priorityCount={4}
        />
      )}
      {popularTV.items.length > 0 && (
        <MediaRow
          title={`Popular ${genre.name} Series`}
          items={popularTV.items}
          viewAllHref={`/tv?genre=${ids.tv}`}
        />
      )}

      <AdSlot placement="home-feed" />

      {topMovies.items.length > 0 && (
        <MediaRow
          title={`Top Rated ${genre.name} Movies`}
          items={topMovies.items}
          viewAllHref={`/movies?genre=${ids.movie}&sort=vote_average.desc`}
        />
      )}
      {topTV.items.length > 0 && (
        <MediaRow
          title={`Top Rated ${genre.name} Series`}
          items={topTV.items}
          viewAllHref={`/tv?genre=${ids.tv}&sort=vote_average.desc`}
        />
      )}
    </div>
  );
}
