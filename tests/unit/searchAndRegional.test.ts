import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as searchRoute } from "@/app/api/search/route";
import {
  discoverMovies,
  discoverTV,
  getBanglaMovies,
  getHindiMovies,
  getSouthIndianMovies,
  getBanglaTV,
  getHindiTV,
} from "@/lib/api/tmdb/client";
import { NextRequest } from "next/server";

describe("Search API Route Handler", () => {
  it("returns empty results when query is empty or whitespace", async () => {
    const req = new NextRequest("http://localhost:3000/api/search?q=");
    const res = await searchRoute(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toEqual([]);
    expect(data.totalResults).toBe(0);
  });

  it("handles valid query and returns search results", async () => {
    const req = new NextRequest("http://localhost:3000/api/search?q=Dune&type=movie");
    const res = await searchRoute(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.page).toBe(1);
  });
});

describe("Regional Cinema TMDB Client", () => {
  it("discovers movies with regional language options", async () => {
    const banglaRes = await discoverMovies({ language: "bn" });
    expect(banglaRes).toBeDefined();
    expect(Array.isArray(banglaRes.items)).toBe(true);

    const hindiRes = await discoverMovies({ language: "hi" });
    expect(hindiRes).toBeDefined();
    expect(Array.isArray(hindiRes.items)).toBe(true);

    const southRes = await discoverMovies({ language: "south" });
    expect(southRes).toBeDefined();
    expect(Array.isArray(southRes.items)).toBe(true);
  });

  it("calls dedicated regional helpers without throwing", async () => {
    const bangla = await getBanglaMovies(1);
    expect(bangla).toBeDefined();

    const hindi = await getHindiMovies(1);
    expect(hindi).toBeDefined();

    const south = await getSouthIndianMovies(1);
    expect(south).toBeDefined();

    const banglaTV = await getBanglaTV(1);
    expect(banglaTV).toBeDefined();

    const hindiTV = await getHindiTV(1);
    expect(hindiTV).toBeDefined();
  });
});

