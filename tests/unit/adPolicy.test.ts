import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdPageType, reserveAdRequest } from "@/lib/ads/adPolicy";

describe("ad request policy", () => {
  const originalEnv = { ...process.env };
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ADS_ENABLED: "true",
      NEXT_PUBLIC_AD_MAX_REQUESTS_PER_PAGE: "1",
      NEXT_PUBLIC_AD_MAX_REQUESTS_PER_SESSION: "2",
      NEXT_PUBLIC_AD_ALLOW_MOBILE_STICKY: "false",
    };
    sessionStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    process.env = originalEnv;
    window.matchMedia = originalMatchMedia;
  });

  it("allows one lazy request per route view and suppresses the rest", () => {
    expect(reserveAdRequest("home-top", "/")).toEqual({ allowed: true });
    expect(reserveAdRequest("home-feed", "/")).toEqual({ allowed: false, reason: "page-budget" });
    expect(reserveAdRequest("details-mid", "/movie/42")).toEqual({ allowed: true });
    expect(reserveAdRequest("home-top", "/tv/9")).toEqual({ allowed: false, reason: "session-budget" });
  });

  it("keeps the mobile sticky experiment off without its independent opt-in", () => {
    expect(reserveAdRequest("mobile-sticky", "/")).toEqual({
      allowed: false,
      reason: "mobile-sticky-not-approved",
    });
  });

  it("withholds player-ad requests on compact screens", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    expect(reserveAdRequest("player-bottom", "/watch/movie/42")).toEqual({
      allowed: false,
      reason: "player-on-compact-screen",
    });
  });

  it("classifies page types without storing a URL or user identifier", () => {
    expect(getAdPageType("/")).toBe("home");
    expect(getAdPageType("/movie/42")).toBe("details");
    expect(getAdPageType("/watch/tv/9")).toBe("player");
    expect(getAdPageType("/search?q=test")).toBe("search");
  });
});
