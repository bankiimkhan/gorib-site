"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, SkipBack, SkipForward } from "lucide-react";
import { TVShow, Season } from "@/types/media";
import { StreamResult } from "@/types/streaming";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { ServerSelector } from "@/components/player/ServerSelector";
import { WatchlistButton } from "@/components/common/WatchlistButton";
import { EpisodeList } from "@/components/tv/EpisodeList";
import { useContinueWatching } from "@/lib/hooks/useContinueWatching";
import { formatRuntime } from "@/lib/utils/formatters";
import { episodeHref } from "@/lib/utils/routes";

interface WatchTVClientProps {
  tvShow: TVShow;
  season: number;
  episode: number;
  streamResult: StreamResult;
  seasonData: Season | null;
}

export function WatchTVClient({ tvShow, season, episode, streamResult, seasonData }: WatchTVClientProps) {
  const router = useRouter();
  const [activeSourceIndex, setActiveSourceIndex] = useState(streamResult.defaultSourceIndex || 0);
  const { saveProgress, markStarted, getSavedPosition } = useContinueWatching();

  const currentEpData = seasonData?.episodes?.find((e) => e.episodeNumber === episode);
  const totalEpsInSeason = seasonData?.episodes?.length || 1;
  const watchableSeasons = (tvShow.seasons || []).filter((s) => s.seasonNumber > 0 && s.episodeCount > 0);
  const seasonIndex = watchableSeasons.findIndex((s) => s.seasonNumber === season);
  const nextSeason = seasonIndex >= 0 ? watchableSeasons[seasonIndex + 1] : undefined;
  const prevSeason = seasonIndex > 0 ? watchableSeasons[seasonIndex - 1] : undefined;
  const episodeUrl = (s: number, e: number) => episodeHref(tvShow.tmdbId, s, e);

  // Next: following episode, or the first episode of the next season.
  const nextEpisodeUrl =
    episode < totalEpsInSeason
      ? episodeUrl(season, episode + 1)
      : nextSeason
        ? episodeUrl(nextSeason.seasonNumber, 1)
        : undefined;
  const nextLabel =
    episode < totalEpsInSeason ? `Episode ${episode + 1}` : nextSeason ? `Season ${nextSeason.seasonNumber}` : "";

  // Previous: earlier episode, or the last episode of the previous season.
  const prevEpisodeUrl =
    episode > 1
      ? episodeUrl(season, episode - 1)
      : prevSeason
        ? episodeUrl(prevSeason.seasonNumber, prevSeason.episodeCount)
        : undefined;

  useEffect(() => {
    markStarted({
      tmdbId: tvShow.tmdbId,
      type: "tv",
      title: tvShow.title,
      posterUrl: tvShow.posterUrl,
      backdropUrl: tvShow.backdropUrl,
      season,
      episode,
    });
  }, [markStarted, tvShow.tmdbId, tvShow.title, tvShow.posterUrl, tvShow.backdropUrl, season, episode]);

  const initialTime = getSavedPosition(tvShow.tmdbId, season, episode);

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    saveProgress({
      tmdbId: tvShow.tmdbId,
      type: "tv",
      title: tvShow.title,
      posterUrl: tvShow.posterUrl,
      backdropUrl: currentEpData?.stillUrl || tvShow.backdropUrl,
      season,
      episode,
      currentTime,
      duration,
    });
  };

  const handleEnded = () => {
    if (nextEpisodeUrl) {
      router.push(nextEpisodeUrl);
    }
  };

  const episodeTitle = currentEpData?.title || `Episode ${episode}`;

  return (
    <div className="pt-16 lg:pt-[68px]">
      <div className="mx-auto w-full max-w-[1600px] sm:px-6 sm:pt-4 lg:px-10">
        <VideoPlayer
          title={`${tvShow.title} · S${season}:E${episode} ${currentEpData?.title || ""}`}
          sources={streamResult.sources}
          poster={currentEpData?.stillUrl || tvShow.backdropUrl}
          initialTime={initialTime}
          activeSourceIndex={activeSourceIndex}
          onSourceChange={setActiveSourceIndex}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          nextEpisodeUrl={nextEpisodeUrl}
        />
      </div>

      <div className="shell mx-auto max-w-[1600px] sm:px-6 lg:px-10">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/tv/${tvShow.tmdbId}`} className="btn btn-ghost btn-sm -ml-3 max-w-full">
            <ArrowLeft className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{tvShow.title}</span>
          </Link>
          <ServerSelector
            sources={streamResult.sources}
            activeSourceIndex={activeSourceIndex}
            onSelectSource={setActiveSourceIndex}
          />
        </div>

        <div className="mt-6 flex flex-col gap-5 border-b border-line pb-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-fg-muted">
              Season {season} · Episode {episode}
              {currentEpData?.runtime ? ` · ${formatRuntime(currentEpData.runtime)}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{episodeTitle}</h1>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">
              {currentEpData?.overview || tvShow.overview}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {prevEpisodeUrl && (
              <Link href={prevEpisodeUrl} className="btn btn-secondary" aria-label="Previous episode">
                <SkipBack className="h-4 w-4 fill-white" aria-hidden="true" />
                <span className="hidden sm:inline">Previous</span>
              </Link>
            )}
            {nextEpisodeUrl && (
              <Link href={nextEpisodeUrl} className="btn btn-primary">
                <SkipForward className="h-4 w-4 fill-black" aria-hidden="true" />
                Next: {nextLabel}
              </Link>
            )}
            <WatchlistButton item={tvShow} />
          </div>
        </div>

        {watchableSeasons.length > 1 && (
          <nav aria-label="Seasons" className="no-scrollbar -mx-[max(1rem,4vw)] mt-8 flex gap-2 overflow-x-auto px-[max(1rem,4vw)] sm:mx-0 sm:px-0">
            {watchableSeasons.map((s) => (
              <Link
                key={s.id}
                href={episodeUrl(s.seasonNumber, 1)}
                aria-current={s.seasonNumber === season ? "page" : undefined}
                className="chip h-9 px-4 text-sm"
              >
                {s.name || `Season ${s.seasonNumber}`}
              </Link>
            ))}
          </nav>
        )}

        {seasonData?.episodes && seasonData.episodes.length > 0 && (
          <section className="mt-6" aria-labelledby="episodes-heading">
            <h2 id="episodes-heading" className="section-title">
              Season {season} episodes
            </h2>
            <EpisodeList
              tvId={tvShow.tmdbId}
              episodes={seasonData.episodes}
              activeEpisode={episode}
              activeLabel="Now playing"
            />
          </section>
        )}
      </div>
    </div>
  );
}
