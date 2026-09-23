"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { TVShow, Season, MediaItem } from "@/types/media";
import { formatRating } from "@/lib/utils/formatters";
import { Play, Star, Calendar, Tv, Video, Bookmark, Check, Loader2 } from "lucide-react";
import { SeasonSelector } from "@/components/tv/SeasonSelector";
import { EpisodeList } from "@/components/tv/EpisodeList";
import { AdSlot } from "@/components/ads/AdSlot";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
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
  const [isPending, startTransition] = useTransition();

  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isBookmarked = isInWatchlist(tvShow.id);

  const handleSeasonChange = (seasonNum: number) => {
    setActiveSeasonNumber(seasonNum);
    startTransition(async () => {
      try {
        const seasonData = await fetchSeasonDetailsAction(tvShow.tmdbId, seasonNum);
        if (seasonData) {
          setCurrentSeason(seasonData);
        }
      } catch (err) {
        console.error("Failed to load season details:", err);
      }
    });
  };

  const watchUrl = `/watch/tv/${tvShow.tmdbId}?season=1&episode=1`;

  return (
    <div className="min-h-screen pb-16">
      {/* Backdrop */}
      <div className="relative h-[48vh] min-h-[360px] sm:h-[60vh] sm:min-h-[460px] w-full bg-black">
        {tvShow.backdropUrl && (
          <Image
            src={tvShow.backdropUrl}
            alt={tvShow.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-35"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-36 md:-mt-44 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Poster Column */}
          <div className="flex flex-col items-center md:items-start">
            <div className="relative aspect-[2/3] w-56 sm:w-64 md:w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-white/10">
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

            {/* Interactive Actions (Watch, Watchlist, Trailer) */}
            <div className="mt-6 flex flex-col gap-2.5 w-full max-w-xs md:max-w-full">
              <Link
                href={watchUrl}
                className="flex items-center justify-center gap-2.5 rounded-xl bg-amber-500 py-3.5 px-6 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Play className="h-4 w-4 fill-black" />
                <span>Watch S1:E1</span>
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleWatchlist(tvShow as unknown as MediaItem)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold border transition-all active:scale-[0.98] ${
                    isBookmarked
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
                      : "border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                  aria-label={isBookmarked ? "Remove TV show from watchlist" : "Add TV show to watchlist"}
                >
                  {isBookmarked ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-amber-400" />
                      <span>In My List</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>Add to List</span>
                    </>
                  )}
                </button>

                {tvShow.trailerUrl && (
                  <a
                    href={tvShow.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 px-3.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    title="Watch Official Trailer on YouTube"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Trailer</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Details Content Column */}
          <div className="md:col-span-2 lg:col-span-3 space-y-6 pt-2 md:pt-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2.5 text-xs">
                {tvShow.rating !== undefined && tvShow.rating > 0 && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />
                    {formatRating(tvShow.rating)}
                  </span>
                )}
                {tvShow.year && (
                  <span className="flex items-center gap-1 text-zinc-400 rounded-md bg-zinc-900/80 border border-zinc-800 px-2 py-0.5">
                    <Calendar className="h-3 w-3" />
                    {tvShow.year}
                  </span>
                )}
                {tvShow.totalSeasons && (
                  <span className="rounded-md bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 text-zinc-300">
                    {tvShow.totalSeasons} {tvShow.totalSeasons === 1 ? "Season" : "Seasons"}
                  </span>
                )}
                {tvShow.totalEpisodes && (
                  <span className="rounded-md bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 text-zinc-300">
                    {tvShow.totalEpisodes} Episodes
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
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
                {tvShow.overview}
              </p>
            </div>

            {/* Cast List */}
            {tvShow.cast && tvShow.cast.length > 0 && (
              <div className="pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Cast & Characters
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tvShow.cast.map((actor) => (
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

        {/* Season & Episode Interface */}
        <div className="mt-14 border-t border-white/5 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Episodes
            </h2>
            {isPending && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Loading Season {activeSeasonNumber}...</span>
              </div>
            )}
          </div>

          {tvShow.seasons && tvShow.seasons.length > 0 && (
            <SeasonSelector
              seasons={tvShow.seasons.filter((s) => s.seasonNumber > 0)}
              activeSeason={activeSeasonNumber}
              onSeasonChange={handleSeasonChange}
            />
          )}

          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-zinc-900/60 border border-zinc-800" />
              ))}
            </div>
          ) : currentSeason?.episodes && currentSeason.episodes.length > 0 ? (
            <EpisodeList tvId={tvShow.tmdbId} episodes={currentSeason.episodes} />
          ) : (
            <div className="py-12 text-center text-sm text-zinc-500">
              No episodes available for Season {activeSeasonNumber}.
            </div>
          )}
        </div>
      </div>

      <AdSlot placement="details-mid" />
    </div>
  );
}
