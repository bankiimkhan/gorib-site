import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveMovieStream, resolveEpisodeStream } from "@/lib/api/streaming/resolver";

describe("Stream Resolver Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Keep the tests offline: language detection falls back gracefully when
    // network calls fail.
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));
  });

  it("resolves a movie stream with default sources", async () => {
    const result = await resolveMovieStream({
      tmdbId: 693134,
      title: "Dune: Part Two",
      year: 2024,
    });

    expect(result).toBeDefined();
    expect(result.mediaId).toBe("movie-693134");
    expect(result.type).toBe("movie");
    expect(result.title).toBe("Dune: Part Two");
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0].url).toContain("vidsrc");
    expect(result.sources.some((s) => s.url.includes("multiembed"))).toBe(true);
  });

  it("resolves a TV episode stream with season and episode numbers", async () => {
    const result = await resolveEpisodeStream({
      tmdbId: 94605,
      season: 1,
      episode: 2,
      title: "House of the Dragon",
    });

    expect(result).toBeDefined();
    expect(result.mediaId).toBe("tv-94605");
    expect(result.type).toBe("tv");
    expect(result.season).toBe(1);
    expect(result.episode).toBe(2);
    expect(result.sources.length).toBeGreaterThan(0);
  });
});

