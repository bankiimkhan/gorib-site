import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getMovieDetails, getTrending } from "@/lib/api/tmdb/client";
import { formatRating, formatRuntime } from "@/lib/utils/formatters";
import { Star, Calendar, Clock, Film } from "lucide-react";
import { MediaRow } from "@/components/common/MediaRow";
import { AdSlot } from "@/components/ads/AdSlot";
import { MovieHeroActions } from "@/components/common/MovieHeroActions";

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) return { title: "Movie Not Found" };

  const movie = await getMovieDetails(tmdbId);
  if (!movie) return { title: "Movie Not Found" };

  return {
    title: `${movie.title} (${movie.year || "Movie"})`,
    description: movie.overview,
    openGraph: {
      title: movie.title,
      description: movie.overview,
      images: movie.backdropUrl ? [movie.backdropUrl] : undefined,
    },
  };
}

export default async function MovieDetailsPage({ params }: MoviePageProps) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId)) {
    notFound();
  }

  const movie = await getMovieDetails(tmdbId);
  if (!movie) {
    notFound();
  }

  // Related recommendations
  const trending = await getTrending("movie", "week");
  const relatedMovies = trending.filter((m) => m.tmdbId !== tmdbId).slice(0, 10);

  return (
    <div className="min-h-screen pb-16">
      {/* Backdrop Header */}
      <div className="relative h-[48vh] min-h-[360px] sm:h-[60vh] sm:min-h-[460px] w-full bg-black">
        {movie.backdropUrl && (
          <Image
            src={movie.backdropUrl}
            alt={movie.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-35"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
      </div>

      {/* Main Details Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-36 md:-mt-44 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Poster Column */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative aspect-[2/3] w-56 sm:w-64 md:w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10">
              {movie.posterUrl ? (
                <Image
                  src={movie.posterUrl}
                  alt={movie.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 256px, 320px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600">
                  <Film className="h-12 w-12" />
                </div>
              )}
            </div>

            {/* Interactive Hero Actions (Watch, Watchlist, Trailer) */}
            <MovieHeroActions movie={movie} />
          </div>

          {/* Details Content Column */}
          <div className="md:col-span-2 lg:col-span-3 space-y-6 pt-2 md:pt-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2.5 text-xs">
                {movie.rating !== undefined && movie.rating > 0 && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    {formatRating(movie.rating)}
                  </span>
                )}
                {movie.year && (
                  <span className="flex items-center gap-1 text-zinc-400 rounded-md bg-zinc-900/80 border border-zinc-800 px-2 py-0.5">
                    <Calendar className="h-3 w-3" />
                    {movie.year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="flex items-center gap-1 text-zinc-400 rounded-md bg-zinc-900/80 border border-zinc-800 px-2 py-0.5">
                    <Clock className="h-3 w-3" />
                    {formatRuntime(movie.runtime)}
                  </span>
                )}
                {movie.status && (
                  <span className="rounded-md bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 text-zinc-400">
                    {movie.status}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                {movie.title}
              </h1>

              {movie.tagline && (
                <p className="mt-2 text-sm italic text-amber-500/90 font-medium">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/genre/${g.slug}`}
                    className="rounded-full bg-zinc-900/80 border border-zinc-800 px-3.5 py-1 text-xs font-medium text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Overview */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Overview
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl">
                {movie.overview}
              </p>
            </div>

            {/* Director & Crew */}
            {movie.director && (
              <div className="text-xs">
                <span className="uppercase tracking-wider text-zinc-500 font-semibold">
                  Director:{" "}
                </span>
                <span className="font-semibold text-zinc-200 ml-1">{movie.director}</span>
              </div>
            )}

            {/* Cast List */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Top Cast
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {movie.cast.map((actor) => (
                    <div
                      key={actor.id}
                      className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 text-center"
                    >
                      <div className="relative mx-auto aspect-square w-14 overflow-hidden rounded-full bg-zinc-800 mb-2 ring-1 ring-white/5">
                        {actor.profileUrl ? (
                          <Image
                            src={actor.profileUrl}
                            alt={actor.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-600 text-[10px]">
                            {actor.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-zinc-200 truncate">{actor.name}</h3>
                      <p className="text-[10px] text-zinc-400 truncate">{actor.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AdSlot placement="details" />

      {/* Recommended / Similar Movies */}
      {relatedMovies.length > 0 && (
        <div className="mt-8">
          <MediaRow title="You Might Also Like" items={relatedMovies} />
        </div>
      )}
    </div>
  );
}
