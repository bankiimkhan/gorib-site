import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/subtitles/route";
import { NextRequest } from "next/server";
import * as tmdbClient from "@/lib/api/tmdb/client";

describe("/api/subtitles endpoint", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns valid WebVTT for a movie with correct headers", async () => {
    vi.spyOn(tmdbClient, "getMovieDetails").mockResolvedValue({
      id: "movie-693134",
      tmdbId: 693134,
      type: "movie",
      title: "Dune: Part Two",
      overview: "",
      genres: [],
    });

    const req = new NextRequest("http://localhost:3000/api/subtitles?tmdbId=693134&lang=bn&type=movie");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/vtt");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");

    const text = await res.text();
    expect(text).toContain("WEBVTT");
    expect(text).toContain("Language: bn");
    expect(text).toContain("Dune: Part Two");
    expect(text).toContain("Bengali Subtitles");
  });

  it("returns valid WebVTT for a TV episode", async () => {
    vi.spyOn(tmdbClient, "getTVDetails").mockResolvedValue({
      id: "tv-94605",
      tmdbId: 94605,
      type: "tv",
      title: "House of the Dragon",
      overview: "",
      genres: [],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/subtitles?tmdbId=94605&lang=es&type=tv&season=1&episode=2"
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("WEBVTT");
    expect(text).toContain("Language: es");
    expect(text).toContain("House of the Dragon S1:E2");
    expect(text).toContain("Spanish Subtitles");
  });

  it("handles invalid or missing tmdbId gracefully without throwing 500", async () => {
    const req = new NextRequest("http://localhost:3000/api/subtitles?tmdbId=invalid&lang=en");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("WEBVTT");
    expect(res.headers.get("Content-Type")).toContain("text/vtt");
  });
});

