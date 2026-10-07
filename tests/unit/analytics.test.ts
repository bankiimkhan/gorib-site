import { describe, it, expect, beforeEach } from "vitest";
import { countryCodeToFlag, getCountryName, detectCountryFromHeaders } from "@/lib/analytics/countries";
import {
  memoryStore,
  recordPing,
  recordLeave,
  recordWatch,
  getAnalyticsSummary,
} from "@/lib/analytics/store";
import { GET, POST } from "@/app/api/analytics/route";
import { NextRequest } from "next/server";

describe("Analytics Countries Utilities", () => {
  it("converts ISO codes to flag emojis", () => {
    expect(countryCodeToFlag("BD")).toBe("🇧🇩");
    expect(countryCodeToFlag("US")).toBe("🇺🇸");
    expect(countryCodeToFlag("IN")).toBe("🇮🇳");
    expect(countryCodeToFlag("XX")).toBe("🌐");
    expect(countryCodeToFlag("")).toBe("🌐");
  });

  it("returns proper country names", () => {
    expect(getCountryName("BD")).toBe("Bangladesh");
    expect(getCountryName("US")).toBe("United States");
    expect(getCountryName("IN")).toBe("India");
    expect(getCountryName("GB")).toBe("United Kingdom");
    expect(getCountryName("XX")).toBe("Global / Unknown");
  });

  it("detects country from Cloudflare headers", () => {
    const headers = new Headers();
    headers.set("cf-ipcountry", "BD");
    expect(detectCountryFromHeaders(headers)).toBe("BD");
  });

  it("falls back to timezone mapping when cf header is missing", () => {
    const headers = new Headers();
    expect(detectCountryFromHeaders(headers, "Asia/Dhaka")).toBe("BD");
    expect(detectCountryFromHeaders(headers, "Europe/London")).toBe("GB");
  });
});

describe("Analytics Store", () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it("records pings and tracks unique visitors and live viewers", async () => {
    const res1 = await recordPing({
      visitorId: "user-100",
      sessionId: "tab-1",
      country: "BD",
    });

    expect(res1.liveViewers).toBe(1);
    expect(res1.totalVisitors).toBe(1);

    const res2 = await recordPing({
      visitorId: "user-200",
      sessionId: "tab-2",
      country: "US",
    });

    expect(res2.liveViewers).toBe(2);
    expect(res2.totalVisitors).toBe(2);
  });

  it("handles user leave", async () => {
    await recordPing({
      visitorId: "user-100",
      sessionId: "tab-1",
      country: "BD",
    });
    await recordLeave("tab-1");

    const summary = await getAnalyticsSummary();
    expect(summary.liveViewers).toBe(1);
  });

  it("tracks repeating users when isReturning is true", async () => {
    await recordPing({
      visitorId: "user-returning",
      sessionId: "tab-ret",
      country: "BD",
      isReturning: true,
    });

    const summary = await getAnalyticsSummary();
    expect(summary.repeatingUsers.returningVisitors).toBe(1);
    expect(summary.repeatingUsers.repeatRate).toBe(100);
  });

  it("records watched minutes and updates category totals and top titles", async () => {
    await recordWatch({
      visitorId: "viewer-1",
      sessionId: "tab-1",
      seconds: 120,
      mediaType: "movie",
      title: "Test Movie",
      country: "BD",
    });

    await recordWatch({
      visitorId: "viewer-1",
      sessionId: "tab-1",
      seconds: 180,
      mediaType: "tv",
      title: "Test TV Show",
      country: "BD",
    });

    const summary = await getAnalyticsSummary("BD");
    expect(summary.watchedMinutes.totalMinutes).toBe(5);
    expect(summary.watchedMinutes.byType.movie).toBe(2);
    expect(summary.watchedMinutes.byType.tv).toBe(3);

    const top = summary.watchedMinutes.topTitles.find((t) => t.title === "Test Movie");
    expect(top).toBeDefined();
    expect(top?.watchMinutes).toBe(2);
  });
});

describe("Analytics API Route (/api/analytics)", () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it("returns full analytics summary on GET", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.countries).toBeDefined();
    expect(data.repeatingUsers).toBeDefined();
    expect(data.watchedMinutes).toBeDefined();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("processes ping on POST", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics", {
      method: "POST",
      body: JSON.stringify({
        action: "ping",
        visitorId: "test-visitor-1",
        sessionId: "test-session-1",
        country: "IN",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalVisitors).toBe(1);
  });

  it("processes watch tracking on POST", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics", {
      method: "POST",
      body: JSON.stringify({
        action: "watch",
        visitorId: "test-visitor-1",
        sessionId: "test-session-1",
        seconds: 60,
        mediaType: "movie",
        title: "Interstellar",
        country: "US",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
