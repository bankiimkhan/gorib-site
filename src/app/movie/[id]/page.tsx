import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getMovieDetails } from "@/lib/api/tmdb/client";
import { formatRuntime } from "@/lib/utils/formatters";
import { MediaRow } from "@/components/common/MediaRow";
import { AdSlot } from "@/components/ads/AdSlot";
import { getLanguageDisplayName } from "@/lib/utils/languages";
import { DetailHero, RatingBadge } from "@/components/details/DetailHero";
import { TitleActions } from "@/components/details/TitleActions";
import {
  CastRow,
  FactsList,
  ReviewsSection,
  SectionHeading,
  SectionNav,
  TrailerCard,
} from "@/components/details/DetailSections";

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

  const relatedMovies = movie.recommendations || [];
  const reviews = movie.reviews || [];
  const sections = [
    movie.trailerUrl && { id: "trailer", label: "Trailer" },
    movie.cast?.length && { id: "cast", label: "Top Cast" },
    { id: "reviews", label: `Reviews${reviews.length ? ` (${reviews.length})` : ""}` },
    relatedMovies.length && { id: "related", label: "More Like This" },
    { id: "about", label: "About" },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="min-h-screen pb-16">
      <DetailHero
        item={movie}
        kind="Movie"
        meta={[
          <RatingBadge key="rating" rating={movie.rating} />,
          movie.year,
          movie.runtime ? formatRuntime(movie.runtime) : null,
          movie.originalLanguage && movie.originalLanguage !== "en"
            ? getLanguageDisplayName(movie.originalLanguage)
            : null,
        ]}
        actions={
          <TitleActions item={movie} playHref={`/watch/movie/${movie.tmdbId}`} hasTrailer={Boolean(movie.trailerUrl)} />
        }
      />

      <div className="shell mt-10 md:mt-6">
        <SectionNav sections={sections} />

        {movie.trailerUrl && (
          <section id="trailer" className="mb-14 scroll-mt-36">
            <SectionHeading>Trailer</SectionHeading>
            <TrailerCard trailerUrl={movie.trailerUrl} title={movie.title} />
          </section>
        )}

        {movie.cast && movie.cast.length > 0 && (
          <section id="cast" className="mb-14 scroll-mt-36">
            <SectionHeading>Top Cast</SectionHeading>
            <CastRow cast={movie.cast} />
          </section>
        )}

        <section id="reviews" className="mb-4 scroll-mt-36">
          <SectionHeading>Reviews</SectionHeading>
          <ReviewsSection reviews={reviews} />
        </section>
      </div>

      <AdSlot placement="details-mid" />

      {relatedMovies.length > 0 && (
        <div id="related" className="scroll-mt-36">
          <MediaRow title="More Like This" items={relatedMovies} />
        </div>
      )}

      <section id="about" className="shell mt-10 scroll-mt-36">
        <SectionHeading>About {movie.title}</SectionHeading>
        <FactsList
          facts={[
            { label: "Director", value: movie.director },
            { label: "Released", value: movie.releaseDate },
            { label: "Status", value: movie.status },
            {
              label: "Original language",
              value: movie.originalLanguage ? getLanguageDisplayName(movie.originalLanguage) : undefined,
            },
            {
              label: "Cast",
              value: movie.cast?.length ? movie.cast.slice(0, 4).map((c) => c.name).join(", ") : undefined,
            },
            {
              label: "IMDb",
              value: movie.imdbId ? (
                <a
                  href={`https://www.imdb.com/title/${movie.imdbId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-white/30 underline-offset-2 hover:decoration-white"
                >
                  View on IMDb
                </a>
              ) : undefined,
            },
          ]}
        />
      </section>
    </div>
  );
}
