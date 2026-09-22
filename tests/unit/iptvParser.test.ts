import { describe, it, expect } from "vitest";
import { parseM3U } from "@/lib/api/iptv/parser";

describe("IPTV M3U Parser", () => {
  it("should return empty array for empty or null content", () => {
    expect(parseM3U("")).toEqual([]);
    expect(parseM3U("   ")).toEqual([]);
    // @ts-expect-error test invalid input
    expect(parseM3U(null)).toEqual([]);
  });

  it("should parse standard #EXTINF entries and extract metadata", () => {
    const m3uSample = `
#EXTM3U
#EXTINF:-1 tvg-id="ATNBangla.bd@SD" tvg-logo="https://i.imgur.com/K1HmMRz.png" group-title="General",ATN Bangla (720p)
http://tvsen5.aynascope.net/atnbangla/index.m3u8
#EXTINF:-1 tvg-id="DBCNews.bd@SD" tvg-logo="https://i.imgur.com/Qbt6q4z.png" group-title="News;Public",DBC News (480p) [Geo-blocked]
https://tvn3.chowdhury-shaheb.com/dbc/index.m3u8
    `;

    const channels = parseM3U(m3uSample);

    expect(channels).toHaveLength(2);

    expect(channels[0]).toEqual({
      id: "ATNBangla.bd@SD",
      name: "ATN Bangla",
      rawName: "ATN Bangla (720p)",
      logo: "https://i.imgur.com/K1HmMRz.png",
      group: "General",
      url: "http://tvsen5.aynascope.net/atnbangla/index.m3u8",
      country: "bd",
      quality: "720P",
      isGeoBlocked: false,
      httpFallback: true,
    });

    expect(channels[1]).toEqual({
      id: "DBCNews.bd@SD",
      name: "DBC News",
      rawName: "DBC News (480p) [Geo-blocked]",
      logo: "https://i.imgur.com/Qbt6q4z.png",
      group: "News",
      url: "https://tvn3.chowdhury-shaheb.com/dbc/index.m3u8",
      country: "bd",
      quality: "480P",
      isGeoBlocked: true,
      httpFallback: false,
    });
  });

  it("should use default country if not present in tvg-id", () => {
    const sample = `
#EXTINF:-1 tvg-id="SkyNews" group-title="News",Sky News (1080p)
https://live.skynews.com/playlist.m3u8
    `;

    const channels = parseM3U(sample, "uk");
    expect(channels).toHaveLength(1);
    expect(channels[0].country).toBe("uk");
    expect(channels[0].quality).toBe("1080P");
  });
});

