"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TVShow, Season, MediaItem } from "@/types/media";
import { StreamResult } from "@/types/streaming";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { ServerSelector } from "@/components/player/ServerSelector";
import { useContinueWatching } from "@/lib/hooks/useContinueWatching";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { ArrowLeft, SkipForward, Play, Bookmark, Check } from "lucide-react";

interface WatchTVClientProps {
  tvShow: TVShow;
  season: number;
  episode: number;
  streamResult: StreamResult;
  seasonData: Season | null;
}

export function WatchTVClient({
  tvShow,
  season,
  episode,
  streamResult,
  seasonData,
}: WatchTVClientProps) {
  const router = useRouter();
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const { saveProgress, getSavedPosition } = useContinueWatching();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const isBookmarked = isInWatchlist(tvShow.id);

  const currentEpData = seasonData?.episodes?.find((e) => e.episodeNumber === episode);
  const totalEpsInSeason = seasonData?.episodes?.length || 1;
  const hasNextEpisode = episode < totalEpsInSeason;
  const nextEpisodeUrl = hasNextEpisode
    ? `/watch/tv/${tvShow.tmdbId}?season=${season}&episode=${episode + 1}`
    : undefined;

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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      {/* Breadcrumb Back Link */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/tv/${tvShow.tmdbId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {tvShow.title}</span>
        </Link>
        <span className="text-xs font-bold text-amber-500">
          Season {season} • Episode {episode}
        </span>
      </div>

      {/* Dominant Video Player */}
      <div className="w-full shadow-2xl rounded-2xl overflow-hidden bg-black ring-1 ring-white/10">
        <VideoPlayer
          title={`${tvShow.title} - S${season}:E${episode} ${currentEpData?.title || ""}`}
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

      {/* Dedicated Server Selection Bar */}
      <ServerSelector
        sources={streamResult.sources}
        activeSourceIndex={activeSourceIndex}
        onSelectSource={setActiveSourceIndex}
      />

      {/* Episode Header & Info */}
      <div className="mt-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-white/5">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-md bg-amber-500/20 px-2.5 py-0.5 font-bold text-amber-400 border border-amber-500/30">
              Season {season} Episode {episode}
            </span>
            {currentEpData?.airDate && (
              <span className="text-zinc-500">{currentEpData.airDate}</span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {currentEpData?.title || `Episode ${episode}`}
          </h1>

          <p className="text-sm text-zinc-300 leading-relaxed">
            {currentEpData?.overview || tvShow.overview}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Next Episode CTA Button */}
          {hasNextEpisode && (
            <Link
              href={nextEpisodeUrl!}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <SkipForward className="h-4 w-4 fill-black" />
              <span>Next: Ep {episode + 1}</span>
            </Link>
          )}

          {/* Watchlist Toggle */}
          <button
            type="button"
            onClick={() => toggleWatchlist(tvShow as unknown as MediaItem)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
              isBookmarked
                ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {isBookmarked ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span>{isBookmarked ? "In My List" : "Add to List"}</span>
          </button>
        </div>
      </div>

      {/* Episode Navigation Drawer / Strip */}
      {seasonData?.episodes && seasonData.episodes.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-bold text-white mb-4">
            Season {season} Episodes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {seasonData.episodes.map((ep) => {
              const isActive = ep.episodeNumber === episode;
              const epUrl = `/watch/tv/${tvShow.tmdbId}?season=${season}&episode=${ep.episodeNumber}`;

              return (
                <Link
                  key={ep.id}
                  href={epUrl}
                  className={`group flex gap-3 p-2.5 rounded-xl border transition-all ${
                    isActive
                      ? "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30"
                      : "border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="relative aspect-video w-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-950">
                    {ep.stillUrl ? (
                      <Image
                        src={ep.stillUrl}
                        alt={ep.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                        EP {ep.episodeNumber}
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                        <Play className="h-4 w-4 fill-amber-400 text-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-amber-400 transition-colors">
                      {ep.episodeNumber}. {ep.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      {ep.runtime ? `${ep.runtime}m` : ""}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
