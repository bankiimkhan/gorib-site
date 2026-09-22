import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getGenreBySlug } from "@/lib/api/tmdb/genres";
import { discoverMovies, discoverTV } from "@/lib/api/tmdb/client";
import { MediaCard } from "@/components/common/MediaCard";
import { AdSlot } from "@/components/ads/AdSlot";

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

  const [movies, tvShows] = await Promise.all([
    discoverMovies({ genreId: genre.id, sortBy: "popularity.desc", page: 1 }),
    discoverTV({ genreId: genre.id, sortBy: "popularity.desc", page: 1 }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {genre.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Explore the best {genre.name.toLowerCase()} films and series.
        </p>
      </div>

      {/* Movies in Genre */}
      {movies.items.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold text-white">Popular {genre.name} Movies</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.items.slice(0, 12).map((m) => (
              <MediaCard key={m.id} item={m} />
            ))}
          </div>
        </section>
      )}

      <AdSlot placement="home-feed" />

      {/* TV in Genre */}
      {tvShows.items.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-white">Popular {genre.name} TV Shows</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {tvShows.items.slice(0, 12).map((t) => (
              <MediaCard key={t.id} item={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

