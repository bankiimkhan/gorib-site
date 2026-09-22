"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TVShow, Season } from "@/types/media";
import { formatRating } from "@/lib/utils/formatters";
import { Play, Star, Calendar, Tv, Video } from "lucide-react";
import { SeasonSelector } from "@/components/tv/SeasonSelector";
import { EpisodeList } from "@/components/tv/EpisodeList";
import { AdSlot } from "@/components/ads/AdSlot";

interface TVDetailsClientProps {
  tvShow: TVShow;
  initialSeason: Season | null;
}

export function TVDetailsClient({ tvShow, initialSeason }: TVDetailsClientProps) {
  const [activeSeasonNumber, setActiveSeasonNumber] = useState(
    initialSeason?.seasonNumber || 1
  );
  const [currentSeason, setCurrentSeason] = useState<Season | null>(initialSeason);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);

  const handleSeasonChange = async (seasonNum: number) => {
    setActiveSeasonNumber(seasonNum);
    setIsLoadingSeason(true);

    try {
      const res = await fetch(`/api/stream/tv/${tvShow.tmdbId}?season=${seasonNum}&episode=1`);
      // We also update season state
      setCurrentSeason((prev) =>
        prev
          ? {
              ...prev,
              seasonNumber: seasonNum,
              episodes: prev.episodes?.map((e) => ({ ...e, seasonNumber: seasonNum })),
            }
          : null
      );
    } catch {
      // Continue
    } finally {
      setIsLoadingSeason(false);
    }
  };

  const watchUrl = `/watch/tv/${tvShow.tmdbId}?season=1&episode=1`;

  return (
    <div className="min-h-screen pb-16">
      {/* Backdrop */}
      <div className="relative h-[60vh] min-h-[450px] w-full bg-black">
        {tvShow.backdropUrl && (
          <Image
            src={tvShow.backdropUrl}
            alt={tvShow.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-40 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Poster Column */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative aspect-[2/3] w-64 md:w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10">
              {tvShow.posterUrl ? (
                <Image
                  src={tvShow.posterUrl}
                  alt={tvShow.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 256px, 320px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-600">
                  <Tv className="h-12 w-12" />
                </div>
              )}
            </div>

            <Link
              href={watchUrl}
              className="mt-6 flex w-full max-w-xs md:max-w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-base font-bold text-black shadow-lg shadow-amber-500/25 hover:bg-amber-400 hover:scale-[1.02] transition-all"
            >
              <Play className="h-5 w-5 fill-black" />
              <span>Watch S1:E1</span>
            </Link>

            {tvShow.trailerUrl && (
              <a
                href={tvShow.trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full max-w-xs md:max-w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <Video className="h-4 w-4" />
                <span>Watch Trailer</span>
              </a>
            )}
          </div>

          {/* Details Content Column */}
          <div className="md:col-span-2 lg:col-span-3 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                {tvShow.rating !== undefined && tvShow.rating > 0 && (
                  <span className="flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    {formatRating(tvShow.rating)}
                  </span>
                )}
                {tvShow.year && (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {tvShow.year}
                  </span>
                )}
                {tvShow.totalSeasons && (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
                    {tvShow.totalSeasons} {tvShow.totalSeasons === 1 ? "Season" : "Seasons"}
                  </span>
                )}
                {tvShow.totalEpisodes && (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
                    {tvShow.totalEpisodes} Episodes
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                {tvShow.title}
              </h1>

              {tvShow.tagline && (
                <p className="mt-2 text-sm italic text-amber-500/90 font-medium">
                  &ldquo;{tvShow.tagline}&rdquo;
                </p>
              )}
            </div>

            {/* Genres */}
            {tvShow.genres && tvShow.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tvShow.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/genre/${g.slug}`}
                    className="rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Overview */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Overview
              </h3>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl">
                {tvShow.overview}
              </p>
            </div>

            {/* Cast List */}
            {tvShow.cast && tvShow.cast.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  Cast & Characters
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tvShow.cast.map((actor) => (
                    <div
                      key={actor.id}
                      className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 text-center"
                    >
                      <div className="relative mx-auto aspect-square w-14 overflow-hidden rounded-full bg-zinc-800 mb-2">
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
                            No photo
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200 truncate">{actor.name}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">{actor.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Season & Episode Interface */}
        <div className="mt-14 border-t border-zinc-800 pt-8">
          <h2 className="text-2xl font-bold text-white mb-6">Episodes</h2>

          {tvShow.seasons && tvShow.seasons.length > 0 && (
            <SeasonSelector
              seasons={tvShow.seasons.filter((s) => s.seasonNumber > 0)}
              activeSeason={activeSeasonNumber}
              onSeasonChange={handleSeasonChange}
            />
          )}

          {isLoadingSeason ? (
            <div className="py-12 text-center text-zinc-500">Loading episodes...</div>
          ) : currentSeason?.episodes ? (
            <EpisodeList tvId={tvShow.tmdbId} episodes={currentSeason.episodes} />
          ) : (
            <div className="py-8 text-zinc-500">No episodes available.</div>
          )}
        </div>
      </div>

      <AdSlot placement="details" />
    </div>
  );
}

