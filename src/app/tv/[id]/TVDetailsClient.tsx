"use client";

import React, { useState, useTransition } from "react";
import { TVShow, Season } from "@/types/media";
import { Loader2 } from "lucide-react";
import { SeasonSelector } from "@/components/tv/SeasonSelector";
import { EpisodeList } from "@/components/tv/EpisodeList";
import { AdSlot } from "@/components/ads/AdSlot";
import { useContinueWatching } from "@/lib/hooks/useContinueWatching";
import { MediaRow } from "@/components/common/MediaRow";
import { getLanguageDisplayName } from "@/lib/utils/languages";
import { episodeHref } from "@/lib/utils/routes";
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
import { fetchSeasonDetailsAction } from "./actions";

interface TVDetailsClientProps {
  tvShow: TVShow;
  initialSeason: Season | null;
}

export function TVDetailsClient({ tvShow, initialSeason }: TVDetailsClientProps) {
  const [activeSeasonNumber, setActiveSeasonNumber] = useState(
    initialSeason?.seasonNumber || 1
  );
  const [currentSeason, setCurrentSeason] = useState<Season | null>(initialSeason);
  const [seasonError, setSeasonError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { getLatestEpisode } = useContinueWatching();
  const resume = getLatestEpisode(tvShow.tmdbId);

  const handleSeasonChange = (seasonNum: number) => {
    setActiveSeasonNumber(seasonNum);
    setSeasonError(false);
    startTransition(async () => {
      try {
        const seasonData = await fetchSeasonDetailsAction(tvShow.tmdbId, seasonNum);
        if (seasonData) {
          setCurrentSeason(seasonData);
        } else {
          setSeasonError(true);
        }
      } catch {
        setSeasonError(true);
      }
    });
  };

  const firstSeason = initialSeason?.seasonNumber || 1;
  const watchUrl = resume
    ? episodeHref(tvShow.tmdbId, resume.season || 1, resume.episode || 1)
    : episodeHref(tvShow.tmdbId, firstSeason, 1);
  const watchLabel = resume ? `Resume S${resume.season || 1}:E${resume.episode || 1}` : "Play";

  const related = tvShow.recommendations || [];
  const reviews = tvShow.reviews || [];
  const sections = [
    { id: "episodes", label: "Episodes" },
    tvShow.trailerUrl && { id: "trailer", label: "Trailer" },
    tvShow.cast?.length && { id: "cast", label: "Cast" },
    { id: "reviews", label: `Reviews${reviews.length ? ` (${reviews.length})` : ""}` },
    related.length && { id: "related", label: "More Like This" },
    { id: "about", label: "About" },
  ].filter(Boolean) as { id: string; label: string }[];

  const seasons = (tvShow.seasons || []).filter((s) => s.seasonNumber > 0);

  return (
    <div className="min-h-screen pb-16">
      <DetailHero
        item={tvShow}
        kind="Series"
        meta={[
          <RatingBadge key="rating" rating={tvShow.rating} />,
          tvShow.year,
          tvShow.totalSeasons ? `${tvShow.totalSeasons} ${tvShow.totalSeasons === 1 ? "Season" : "Seasons"}` : null,
          tvShow.totalEpisodes ? `${tvShow.totalEpisodes} Episodes` : null,
        ]}
        actions={
          <TitleActions item={tvShow} playHref={watchUrl} playLabel={watchLabel} hasTrailer={Boolean(tvShow.trailerUrl)} />
        }
      />

      <div className="shell mt-10 md:mt-6">
        <SectionNav sections={sections} />

        <section id="episodes" className="scroll-mt-36" aria-busy={isPending}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionHeading>Episodes</SectionHeading>
            {isPending && (
              <p className="flex items-center gap-1.5 text-sm text-fg-muted" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading season {activeSeasonNumber}…
              </p>
            )}
          </div>

          {seasons.length > 0 && (
            <SeasonSelector seasons={seasons} activeSeason={activeSeasonNumber} onSeasonChange={handleSeasonChange} />
          )}

          {isPending ? (
            <div className="mt-4 space-y-3" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-shimmer rounded-md" />
              ))}
            </div>
          ) : seasonError ? (
            <div className="py-12 text-center text-sm text-fg-muted" role="alert">
              Couldn&apos;t load season {activeSeasonNumber}.{" "}
              <button
                type="button"
                onClick={() => handleSeasonChange(activeSeasonNumber)}
                className="font-semibold text-white underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          ) : currentSeason?.episodes && currentSeason.episodes.length > 0 ? (
            <EpisodeList
              tvId={tvShow.tmdbId}
              episodes={currentSeason.episodes}
              activeEpisode={resume?.season === activeSeasonNumber ? resume.episode : undefined}
            />
          ) : (
            <p className="py-12 text-center text-sm text-fg-subtle">
              No episodes available for season {activeSeasonNumber} yet.
            </p>
          )}
        </section>

        {tvShow.trailerUrl && (
          <section id="trailer" className="mt-14 scroll-mt-36">
            <SectionHeading>Trailer</SectionHeading>
            <TrailerCard trailerUrl={tvShow.trailerUrl} title={tvShow.title} />
          </section>
        )}

        {tvShow.cast && tvShow.cast.length > 0 && (
          <section id="cast" className="mt-14 scroll-mt-36">
            <SectionHeading>Cast</SectionHeading>
            <CastRow cast={tvShow.cast} />
          </section>
        )}

        <section id="reviews" className="mt-14 scroll-mt-36">
          <SectionHeading>Reviews</SectionHeading>
          <ReviewsSection reviews={reviews} />
        </section>
      </div>

      <AdSlot placement="details-mid" />

      {related.length > 0 && (
        <div id="related" className="scroll-mt-36">
          <MediaRow title="More Like This" items={related} />
        </div>
      )}

      <section id="about" className="shell mt-10 scroll-mt-36">
        <SectionHeading>About {tvShow.title}</SectionHeading>
        <FactsList
          facts={[
            { label: "First aired", value: tvShow.releaseDate },
            { label: "Last aired", value: tvShow.lastAirDate },
            { label: "Status", value: tvShow.status },
            {
              label: "Original language",
              value: tvShow.originalLanguage ? getLanguageDisplayName(tvShow.originalLanguage) : undefined,
            },
            {
              label: "Cast",
              value: tvShow.cast?.length ? tvShow.cast.slice(0, 4).map((c) => c.name).join(", ") : undefined,
            },
          ]}
        />
      </section>
    </div>
  );
}
