import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAdConfig, isPlacementActive, isProviderApproved, PLACEMENT_DIMENSIONS } from "@/lib/ads/adConfig";

describe("Ad Configuration System", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("respects NEXT_PUBLIC_ADS_ENABLED master switch", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "false";
    process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED = "false";
    delete process.env.NEXT_PUBLIC_AD_PLAYER_BOTTOM;
    expect(isPlacementActive("home-top")).toBe(false);
    expect(isPlacementActive("player-bottom")).toBe(false);

    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    expect(isPlacementActive("home-top")).toBe(true);
    expect(isPlacementActive("player-bottom")).toBe(false);
  });

  it("allows disabling individual placements independently", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_HOME_TOP = "false";
    process.env.NEXT_PUBLIC_AD_HOME_FEED = "true";
    process.env.NEXT_PUBLIC_AD_CATALOG_HEADER = "true";

    expect(isPlacementActive("home-top")).toBe(false);
    expect(isPlacementActive("home-feed")).toBe(true);
    expect(isPlacementActive("catalog-header")).toBe(true);
  });

  it("enforces the sustainable baseline (2 active, all other surfaces inactive)", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    // Clear placement env vars to test pure defaults
    delete process.env.NEXT_PUBLIC_AD_HOME_TOP;
    delete process.env.NEXT_PUBLIC_AD_HOME_FEED;
    delete process.env.NEXT_PUBLIC_AD_DETAILS_MID;
    delete process.env.NEXT_PUBLIC_AD_PLAYER_BOTTOM;
    delete process.env.NEXT_PUBLIC_AD_CATALOG_HEADER;
    delete process.env.NEXT_PUBLIC_AD_CATALOG_IN_FEED;
    delete process.env.NEXT_PUBLIC_AD_SEARCH;
    delete process.env.NEXT_PUBLIC_AD_LIVE_TV;
    delete process.env.NEXT_PUBLIC_AD_MOBILE_STICKY;

    // Two proven discovery placements
    expect(isPlacementActive("home-top")).toBe(true);
    expect(isPlacementActive("details-mid")).toBe(true);

    // All expansion surfaces are off until an experiment validates them.
    expect(isPlacementActive("home-feed")).toBe(false);
    expect(isPlacementActive("player-bottom")).toBe(false);
    expect(isPlacementActive("catalog-header")).toBe(false);
    expect(isPlacementActive("catalog-in-feed")).toBe(false);
    expect(isPlacementActive("search-banner")).toBe(false);
    expect(isPlacementActive("live-tv-banner")).toBe(false);
    expect(isPlacementActive("mobile-sticky")).toBe(false);
  });

  it("provides guaranteed minHeightClass and dimensions for zero-CLS", () => {
    expect(PLACEMENT_DIMENSIONS["home-top"].minHeightClass).toContain("min-h-[50px]");
    expect(PLACEMENT_DIMENSIONS["home-top"].minHeightClass).toContain("sm:min-h-[90px]");
    expect(PLACEMENT_DIMENSIONS["home-feed"].minHeightClass).toContain("min-h-[250px]");
    expect(PLACEMENT_DIMENSIONS["catalog-in-feed"].minHeightClass).toBe("aspect-[2/3]");
    expect(PLACEMENT_DIMENSIONS["mobile-sticky"].minHeightClass).toContain("min-h-[50px]");
  });

  it("resolves the configured Hilltop provider and placeholder mode correctly", () => {
    process.env.NEXT_PUBLIC_AD_PROVIDER = "custom";
    process.env.NEXT_PUBLIC_AD_PLACEHOLDER_MODE = "minimal";

    const config = getAdConfig();
    expect(config.provider).toBe("custom");
    expect(config.placeholderMode).toBe("minimal");
  });

  it("uses conservative request budgets and requires a separate sticky opt-in", () => {
    delete process.env.NEXT_PUBLIC_AD_MAX_REQUESTS_PER_PAGE;
    delete process.env.NEXT_PUBLIC_AD_MAX_REQUESTS_PER_SESSION;
    delete process.env.NEXT_PUBLIC_AD_ALLOW_MOBILE_STICKY;

    const config = getAdConfig();
    expect(config.frequency.maxRequestsPerPage).toBe(1);
    expect(config.frequency.maxRequestsPerSession).toBe(4);
    expect(config.frequency.allowMobileSticky).toBe(false);
  });

  it("requires an explicit review before a custom multitag may render", () => {
    process.env.NEXT_PUBLIC_AD_PROVIDER = "custom";
    delete process.env.NEXT_PUBLIC_CUSTOM_AD_DISPLAY_ONLY_APPROVED;
    expect(isProviderApproved(getAdConfig())).toBe(false);

    process.env.NEXT_PUBLIC_CUSTOM_AD_DISPLAY_ONLY_APPROVED = "true";
    expect(isProviderApproved(getAdConfig())).toBe(true);
  });
});
