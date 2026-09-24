import { StreamResult, StreamingProvider } from "@/types/streaming";
import { getExternalIds } from "@/lib/api/tmdb/client";
import { mockStreamingProvider } from "./mockProvider";
import { customStreamingProvider } from "./customProvider";
import { detectAvailableLanguages } from "./trackDetector";

/**
 * Returns the currently active primary streaming provider (Server 1)
 */
export function getActiveStreamingProvider(): StreamingProvider {
  const providerType = process.env.STREAMING_PROVIDER || "mock";
  if (providerType === "custom" || (process.env.STREAMING_API_KEY && process.env.STREAMING_BASE_URL)) {
    return customStreamingProvider;
  }
  return mockStreamingProvider;
}

/**
 * Resolves movie streaming sources from a TMDB ID
 */
export async function resolveMovieStream(params: {
  tmdbId: number;
  title: string;
  year?: number;
  imdbId?: string;
}): Promise<StreamResult> {
  let resolvedImdbId = params.imdbId;

  if (!resolvedImdbId) {
    try {
      const externalIds = await getExternalIds("movie", params.tmdbId);
      if (externalIds?.imdb_id) {
        resolvedImdbId = externalIds.imdb_id;
      }
    } catch {
      // Continue even if external IDs call fails
    }
  }

  const provider = getActiveStreamingProvider();

  // Resolve the provider sources and dynamic language detection in parallel
  const [server1Result, detectedLanguages] = await Promise.all([
    provider.getMovieStream({
      tmdbId: params.tmdbId,
      imdbId: resolvedImdbId,
      title: params.title,
      year: params.year,
    }),
    detectAvailableLanguages({
      type: "movie",
      tmdbId: params.tmdbId,
      title: params.title,
    }).catch(() => null),
  ]);

  const sources = server1Result.sources;

  // Merge detected subtitles and audio tracks
  const availableSubtitles =
    server1Result.availableSubtitles && server1Result.availableSubtitles.length > 0
      ? server1Result.availableSubtitles
      : detectedLanguages?.availableSubtitles || [];

  const availableAudio =
    server1Result.availableAudio && server1Result.availableAudio.length > 0
      ? server1Result.availableAudio
      : detectedLanguages?.availableAudio || [];

  // Ensure sources have subtitles attached if they don't already have specific subtitles
  const enrichedSources = sources.map((src) => {
    if (!src.subtitles || src.subtitles.length === 0) {
      return {
        ...src,
        subtitles: availableSubtitles.length > 0 ? availableSubtitles : undefined,
        audioTracks: src.audioTracks || (availableAudio.length > 0 ? availableAudio : undefined),
      };
    }
    return src;
  });

  return {
    ...server1Result,
    sources: enrichedSources,
    availableSubtitles: availableSubtitles.length > 0 ? availableSubtitles : undefined,
    availableAudio: availableAudio.length > 0 ? availableAudio : undefined,
  };
}

/**
 * Resolves TV episode streaming sources
 */
export async function resolveEpisodeStream(params: {
  tmdbId: number;
  season: number;
  episode: number;
  title: string;
  imdbId?: string;
}): Promise<StreamResult> {
  let resolvedImdbId = params.imdbId;

  if (!resolvedImdbId) {
    try {
      const externalIds = await getExternalIds("tv", params.tmdbId);
      if (externalIds?.imdb_id) {
        resolvedImdbId = externalIds.imdb_id;
      }
    } catch {
      // Continue even if external IDs call fails
    }
  }

  const provider = getActiveStreamingProvider();

  const [server1Result, detectedLanguages] = await Promise.all([
    provider.getEpisodeStream({
      tmdbId: params.tmdbId,
      imdbId: resolvedImdbId,
      season: params.season,
      episode: params.episode,
      title: params.title,
    }),
    detectAvailableLanguages({
      type: "tv",
      tmdbId: params.tmdbId,
      season: params.season,
      episode: params.episode,
      title: params.title,
    }).catch(() => null),
  ]);

  const sources = server1Result.sources;

  // Merge detected subtitles and audio tracks for this specific episode
  const availableSubtitles =
    server1Result.availableSubtitles && server1Result.availableSubtitles.length > 0
      ? server1Result.availableSubtitles
      : detectedLanguages?.availableSubtitles || [];

  const availableAudio =
    server1Result.availableAudio && server1Result.availableAudio.length > 0
      ? server1Result.availableAudio
      : detectedLanguages?.availableAudio || [];

  const enrichedSources = sources.map((src) => {
    if (!src.subtitles || src.subtitles.length === 0) {
      return {
        ...src,
        subtitles: availableSubtitles.length > 0 ? availableSubtitles : undefined,
        audioTracks: src.audioTracks || (availableAudio.length > 0 ? availableAudio : undefined),
      };
    }
    return src;
  });

  return {
    ...server1Result,
    sources: enrichedSources,
    availableSubtitles: availableSubtitles.length > 0 ? availableSubtitles : undefined,
    availableAudio: availableAudio.length > 0 ? availableAudio : undefined,
  };
}
