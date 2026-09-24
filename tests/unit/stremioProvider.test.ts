import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addonBaseUrl, toBrowserSources, getStremioSources } from "@/lib/api/streaming/stremioProvider";

describe("Stremio addon provider", () => {
  it("normalizes manifest URLs to addon base URLs", () => {
    expect(addonBaseUrl("https://addon.example.com/manifest.json")).toBe("https://addon.example.com");
    expect(addonBaseUrl("stremio://addon.example.com/cfg/manifest.json")).toBe("https://addon.example.com/cfg");
    expect(addonBaseUrl("addon.example.com/")).toBe("https://addon.example.com");
    expect(addonBaseUrl("  ")).toBeNull();
  });

  it("keeps only browser-playable streams", () => {
    const sources = toBrowserSources(
      [
        { url: "https://cdn.example.com/a/master.m3u8", name: "HLS 1080p" },
        { url: "https://cdn.example.com/b.mp4", name: "MP4", title: "720p" },
        { infoHash: "abc123" },
        { externalUrl: "https://example.com" },
        { url: "https://cdn.example.com/c.mkv", behaviorHints: { notWebReady: true } },
        { url: "https://cdn.example.com/d.mp4", behaviorHints: { proxyHeaders: { request: { Referer: "x" } } } },
      ],
      "addon.example.com"
    );
    expect(sources).toHaveLength(2);
    expect(sources[0]).toMatchObject({ format: "hls", quality: "1080p" });
    expect(sources[1]).toMatchObject({ format: "mp4", quality: "720p" });
    expect(sources[0].serverName).toContain("addon.example.com");
  });

  describe("getStremioSources", () => {
    beforeEach(() => {
      vi.stubEnv("STREMIO_ADDONS", "https://addon.example.com/manifest.json");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it("requests series streams with imdb:season:episode ids", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ streams: [{ url: "https://cdn.example.com/e.mp4" }] }))
      );
      const sources = await getStremioSources({ imdbId: "tt0944947", season: 1, episode: 2 });
      expect(String(fetchSpy.mock.calls[0][0])).toBe(
        "https://addon.example.com/stream/series/tt0944947%3A1%3A2.json"
      );
      expect(sources).toHaveLength(1);
    });

    it("returns nothing without an IMDb id or when the addon fails", async () => {
      expect(await getStremioSources({})).toEqual([]);
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("down"));
      expect(await getStremioSources({ imdbId: "tt1375666" })).toEqual([]);
    });
  });
});
