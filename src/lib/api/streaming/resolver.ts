import { StreamResult, StreamingProvider } from "@/types/streaming";
import { getExternalIds } from "@/lib/api/tmdb/client";
import { mockStreamingProvider } from "./mockProvider";
import { customStreamingProvider } from "./customProvider";
import { resolveDhakaFlixMovie, resolveDhakaFlixEpisode } from "./dhakaFlixProvider";

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
 * Resolves movie streaming source from TMDB ID across Server 1 and Server 2 (DhakaFlix BDIX)
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

  // Resolve Server 1 (Primary Streaming API / Cloud) and Server 2 (DhakaFlix BDIX) in parallel
  const [server1Result, server2Source] = await Promise.all([
    provider.getMovieStream({
      tmdbId: params.tmdbId,
      imdbId: resolvedImdbId,
      title: params.title,
      year: params.year,
    }),
    resolveDhakaFlixMovie(params.title, params.year).catch(() => null),
  ]);

  const sources = [...server1Result.sources];

  // If DhakaFlix Server 2 found a matching stream, prepend or add it to sources
  if (server2Source) {
    sources.push(server2Source);
  }

  return {
    ...server1Result,
    sources,
  };
}

/**
 * Resolves TV episode streaming source across Server 1 and Server 2 (DhakaFlix BDIX)
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

  const [server1Result, server2Source] = await Promise.all([
    provider.getEpisodeStream({
      tmdbId: params.tmdbId,
      imdbId: resolvedImdbId,
      season: params.season,
      episode: params.episode,
      title: params.title,
    }),
    resolveDhakaFlixEpisode(params.title, params.season, params.episode).catch(() => null),
  ]);

  const sources = [...server1Result.sources];

  if (server2Source) {
    sources.push(server2Source);
  }

  return {
    ...server1Result,
    sources,
  };
}
