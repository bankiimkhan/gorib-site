import { StreamingProvider, StreamResult } from "@/types/streaming";
import { validateStreamResult } from "./validator";
import { mockStreamingProvider } from "./mockProvider";

/**
 * Production Streaming Provider Adapter
 * Connects to external streaming API securely from server-side
 */
export class CustomStreamingProvider implements StreamingProvider {
  readonly id = "custom";
  readonly name = "Production Streaming API";

  private apiKey = process.env.STREAMING_API_KEY;
  private baseUrl = process.env.STREAMING_BASE_URL;

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.baseUrl);
  }

  async getMovieStream(params: {
    tmdbId: number;
    imdbId?: string;
    title: string;
    year?: number;
  }): Promise<StreamResult> {
    if (!this.isConfigured()) {
      return mockStreamingProvider.getMovieStream(params);
    }

    try {
      const url = new URL(`${this.baseUrl}/movie`);
      if (params.imdbId) url.searchParams.set("imdb_id", params.imdbId);
      url.searchParams.set("tmdb_id", String(params.tmdbId));
      url.searchParams.set("title", params.title);
      if (params.year) url.searchParams.set("year", String(params.year));

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "x-api-key": this.apiKey || "",
          Accept: "application/json",
        },
        next: { revalidate: 0 }, // Streaming URLs are dynamic / signed
      });

      if (!res.ok) {
        console.warn(`[Streaming Provider] API error ${res.status}: ${res.statusText}`);
        return mockStreamingProvider.getMovieStream(params);
      }

      const json = await res.json();
      const validated = validateStreamResult(json);
      if (validated) {
        return validated;
      }

      console.warn("[Streaming Provider] External response failed validation, using fallback");
      return mockStreamingProvider.getMovieStream(params);
    } catch (err) {
      console.error("[Streaming Provider] Request exception:", err);
      return mockStreamingProvider.getMovieStream(params);
    }
  }

  async getEpisodeStream(params: {
    tmdbId: number;
    imdbId?: string;
    season: number;
    episode: number;
    title: string;
  }): Promise<StreamResult> {
    if (!this.isConfigured()) {
      return mockStreamingProvider.getEpisodeStream(params);
    }

    try {
      const url = new URL(`${this.baseUrl}/tv`);
      if (params.imdbId) url.searchParams.set("imdb_id", params.imdbId);
      url.searchParams.set("tmdb_id", String(params.tmdbId));
      url.searchParams.set("season", String(params.season));
      url.searchParams.set("episode", String(params.episode));
      url.searchParams.set("title", params.title);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "x-api-key": this.apiKey || "",
          Accept: "application/json",
        },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        console.warn(`[Streaming Provider] TV API error ${res.status}: ${res.statusText}`);
        return mockStreamingProvider.getEpisodeStream(params);
      }

      const json = await res.json();
      const validated = validateStreamResult(json);
      if (validated) {
        return validated;
      }

      return mockStreamingProvider.getEpisodeStream(params);
    } catch (err) {
      console.error("[Streaming Provider] TV request exception:", err);
      return mockStreamingProvider.getEpisodeStream(params);
    }
  }
}

export const customStreamingProvider = new CustomStreamingProvider();

