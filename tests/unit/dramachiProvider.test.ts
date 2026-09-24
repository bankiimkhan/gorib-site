import { describe, it, expect, vi, afterEach } from "vitest";
import {
  normalizeTitle,
  pickMatch,
  parseEpisodeNumber,
  getDramachiEpisodeSources,
  getDramachiMovieSources,
} from "@/lib/api/streaming/dramachiProvider";

const json = (body: unknown) => new Response(JSON.stringify(body));

describe("Dramachi provider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("normalizes titles, dropping trailing years and HTML entities", () => {
    expect(normalizeTitle("Parasite 2019")).toBe("parasite");
    expect(normalizeTitle("A Parasite&apos;s Heart")).toBe("a parasite s heart");
    expect(normalizeTitle("Squid Game: The Challenge")).toBe("squid game the challenge");
  });

  it("parses episode numbers from file titles", () => {
    expect(parseEpisodeNumber("Queen of Tears S01E16")).toBe(16);
    expect(parseEpisodeNumber("Squid Game S02E07 DUB")).toBe(7);
    expect(parseEpisodeNumber("Parasite 2019 002")).toBe(2);
    expect(parseEpisodeNumber("Trailer")).toBeNull();
  });

  it("matches only exact titles of the right type and year", () => {
    const items = [
      { id: "1", title: "Squid Game - The Challenge", year: "2023", content: "tv series" },
      { id: "2", title: "Squid Game", year: "2021", content: "drama" },
      { id: "3", title: "Parasite 2019", year: "2019", content: "movies" },
    ];
    expect(pickMatch(items, { title: "Squid Game", year: 2021, isMovie: false })?.id).toBe("2");
    expect(pickMatch(items, { title: "Squid Game", year: 2015, isMovie: false })).toBeNull();
    expect(pickMatch(items, { title: "Parasite", year: 2019, isMovie: true })?.id).toBe("3");
    expect(pickMatch(items, { title: "Parasite", isMovie: false })).toBeNull();
  });

  it("returns one source per audio version for an episode", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const params = new URL(String(input)).searchParams;
      switch (params.get("interface")) {
        case "search":
          return json({ data: [{ id: "44459", title: "Squid Game", year: "2021", content: "drama" }] });
        case "title_v2":
          return json({
            seasons: {
              "Season 01": {
                versions: [
                  { version_name: "Original", rip: "Season 01" },
                  { version_name: "Dub", rip: "Season 01 DUB" },
                ],
              },
            },
          });
        case "eplist":
          return json({
            episode_list: [
              { f_title: "Squid Game S01E02", fid: `${params.get("season")}-2`, disk: "3", quality: "540p" },
              { f_title: "Squid Game S01E01", fid: `${params.get("season")}-1`, disk: "3", quality: "540p" },
            ],
          });
        case "getFile":
          return json({
            fileInfo: [{ url: `zone1/${params.get("fid")}.mkv` }],
            hostInfo: { host: "cdn.example.com" },
          });
      }
      return new Response("", { status: 404 });
    });

    const sources = await getDramachiEpisodeSources({ title: "Squid Game", year: 2021, season: 1, episode: 2 });
    expect(sources.map((s) => s.serverName)).toEqual(["Dramachi · Original", "Dramachi · Dub"]);
    expect(sources[0].url).toBe("https://cdn.example.com/cdn/zone1/Season 01-2.mkv");
    expect(sources[1]).toMatchObject({ language: "Dub", quality: "480p" });
  });

  it("returns nothing when the title isn't on Dramachi or the API is down", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(json({ data: [] }));
    expect(await getDramachiMovieSources({ title: "Inception", year: 2010 })).toEqual([]);
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("down"));
    expect(await getDramachiEpisodeSources({ title: "X", season: 1, episode: 1 })).toEqual([]);
  });
});
