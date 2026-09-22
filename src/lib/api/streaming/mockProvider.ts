import { StreamingProvider, StreamResult, StreamSource } from "@/types/streaming";

/**
 * Production-Ready Multi-Server Streaming Provider
 * Supplies high-reliability streaming sources for any movie or TV series
 */
export class MockStreamingProvider implements StreamingProvider {
  readonly id = "mock";
  readonly name = "Global Streaming Network";

  async getMovieStream(params: {
    tmdbId: number;
    imdbId?: string;
    title: string;
    year?: number;
  }): Promise<StreamResult> {
    const sources: StreamSource[] = [
      {
        url: `https://multiembed.mov/?video_id=${params.tmdbId}&tmdb=1`,
        format: "iframe",
        quality: "1080p",
        serverName: "Server 1 (MultiEmbed VIP)",
      },
      {
        url: `https://player.vidsrc.nl/embed/movie/${params.tmdbId}`,
        format: "iframe",
        quality: "1080p",
        serverName: "Server 2 (VidSrc HD)",
      },
      {
        url: `https://autoembed.co/movie/tmdb/${params.tmdbId}`,
        format: "iframe",
        quality: "auto",
        serverName: "Server 3 (AutoEmbed)",
      },
    ];

    return {
      mediaId: `movie-${params.tmdbId}`,
      type: "movie",
      title: params.title,
      sources,
      defaultSourceIndex: 0,
    };
  }

  async getEpisodeStream(params: {
    tmdbId: number;
    imdbId?: string;
    season: number;
    episode: number;
    title: string;
  }): Promise<StreamResult> {
    const sources: StreamSource[] = [
      {
        url: `https://multiembed.mov/?video_id=${params.tmdbId}&tmdb=1&s=${params.season}&e=${params.episode}`,
        format: "iframe",
        quality: "1080p",
        serverName: `Server 1 (MultiEmbed S${params.season}:E${params.episode})`,
      },
      {
        url: `https://player.vidsrc.nl/embed/tv/${params.tmdbId}/${params.season}/${params.episode}`,
        format: "iframe",
        quality: "1080p",
        serverName: `Server 2 (VidSrc S${params.season}:E${params.episode})`,
      },
    ];

    return {
      mediaId: `tv-${params.tmdbId}`,
      type: "tv",
      title: params.title,
      season: params.season,
      episode: params.episode,
      sources,
      defaultSourceIndex: 0,
    };
  }
}

export const mockStreamingProvider = new MockStreamingProvider();
