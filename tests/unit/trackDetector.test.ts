import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectAvailableLanguages } from "@/lib/api/streaming/trackDetector";
import * as tmdbClient from "@/lib/api/tmdb/client";

describe("Track Detector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("detects genuine subtitle and audio languages for a movie", async () => {
    vi.spyOn(tmdbClient, "getTranslations").mockResolvedValue({
      id: 693134,
      translations: [
        { iso_3166_1: "US", iso_639_1: "en", name: "English", english_name: "English" },
        { iso_3166_1: "BD", iso_639_1: "bn", name: "Bengali", english_name: "Bengali" },
        { iso_3166_1: "ES", iso_639_1: "es", name: "Español", english_name: "Spanish" },
      ],
    });

    vi.spyOn(tmdbClient, "getMovieDetails").mockResolvedValue({
      id: "movie-693134",
      tmdbId: 693134,
      type: "movie",
      title: "Dune: Part Two",
      overview: "Overview",
      genres: [],
      originalLanguage: "en",
      spokenLanguages: ["en"],
    });

    const result = await detectAvailableLanguages({
      type: "movie",
      tmdbId: 693134,
      title: "Dune: Part Two",
    });

    expect(result.originalLanguage).toBe("en");
    expect(result.availableSubtitles.length).toBe(3);
    expect(result.availableSubtitles.map((s) => s.language)).toContain("en");
    expect(result.availableSubtitles.map((s) => s.language)).toContain("bn");
    expect(result.availableSubtitles.map((s) => s.language)).toContain("es");

    // Audio tracks
    expect(result.availableAudio.length).toBe(1);
    expect(result.availableAudio[0].language).toBe("en");
    expect(result.availableAudio[0].label).toContain("English [Original]");
  });

  it("evaluates TV episodes independently with episode-specific translations", async () => {
    vi.spyOn(tmdbClient, "getTranslations").mockImplementation(async (type, id, season, episode) => {
      if (season === 1 && episode === 1) {
        return {
          id: 94605,
          translations: [
            { iso_3166_1: "US", iso_639_1: "en", name: "English", english_name: "English" },
            { iso_3166_1: "ES", iso_639_1: "es", name: "Español", english_name: "Spanish" },
          ],
        };
      }
      return {
        id: 94605,
        translations: [
          { iso_3166_1: "US", iso_639_1: "en", name: "English", english_name: "English" },
          { iso_3166_1: "JP", iso_639_1: "ja", name: "日本語", english_name: "Japanese" },
          { iso_3166_1: "BD", iso_639_1: "bn", name: "Bengali", english_name: "Bengali" },
        ],
      };
    });

    vi.spyOn(tmdbClient, "getTVDetails").mockResolvedValue({
      id: "tv-94605",
      tmdbId: 94605,
      type: "tv",
      title: "House of the Dragon",
      overview: "Overview",
      genres: [],
      originalLanguage: "en",
    });

    const ep1Result = await detectAvailableLanguages({
      type: "tv",
      tmdbId: 94605,
      season: 1,
      episode: 1,
    });

    const ep2Result = await detectAvailableLanguages({
      type: "tv",
      tmdbId: 94605,
      season: 1,
      episode: 2,
    });

    // Episode 1 has en, es
    expect(ep1Result.availableSubtitles.length).toBe(2);
    expect(ep1Result.availableSubtitles.map((s) => s.language)).toEqual(["en", "es"]);

    // Episode 2 has en, ja, bn
    expect(ep2Result.availableSubtitles.length).toBe(3);
    expect(ep2Result.availableSubtitles.map((s) => s.language)).toContain("ja");
    expect(ep2Result.availableSubtitles.map((s) => s.language)).toContain("bn");
  });

  it("handles titles with multiple spoken audio languages (e.g. multilingual film)", async () => {
    vi.spyOn(tmdbClient, "getTranslations").mockResolvedValue({
      id: 496243,
      translations: [
        { iso_3166_1: "KR", iso_639_1: "ko", name: "한국어", english_name: "Korean" },
        { iso_3166_1: "US", iso_639_1: "en", name: "English", english_name: "English" },
      ],
    });

    vi.spyOn(tmdbClient, "getMovieDetails").mockResolvedValue({
      id: "movie-496243",
      tmdbId: 496243,
      type: "movie",
      title: "Parasite",
      overview: "Overview",
      genres: [],
      originalLanguage: "ko",
      spokenLanguages: ["ko", "en"],
    });

    const result = await detectAvailableLanguages({
      type: "movie",
      tmdbId: 496243,
    });

    expect(result.originalLanguage).toBe("ko");
    expect(result.availableAudio.length).toBe(2);
    expect(result.availableAudio[0].language).toBe("ko");
    expect(result.availableAudio[0].label).toContain("Korean [Original]");
    expect(result.availableAudio[1].language).toBe("en");
  });

  it("handles missing metadata and API errors gracefully without throwing", async () => {
    vi.spyOn(tmdbClient, "getTranslations").mockRejectedValue(new Error("API Timeout"));
    vi.spyOn(tmdbClient, "getMovieDetails").mockRejectedValue(new Error("Network Error"));

    const result = await detectAvailableLanguages({
      type: "movie",
      tmdbId: 12345,
    });

    expect(result).toBeDefined();
    expect(result.originalLanguage).toBe("en");
    expect(result.availableAudio.length).toBe(1);
    expect(result.availableAudio[0].language).toBe("en");
    expect(result.availableSubtitles).toEqual([]);
  });
});

