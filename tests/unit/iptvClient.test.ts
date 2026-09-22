import { describe, it, expect, vi, beforeEach } from "vitest";
import { getIPTVChannels, IPTV_CATEGORIES, IPTV_COUNTRIES } from "@/lib/api/iptv/client";

describe("IPTV Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("provides predefined categories and countries", () => {
    expect(IPTV_CATEGORIES.length).toBeGreaterThan(5);
    expect(IPTV_COUNTRIES.length).toBeGreaterThan(5);

    const hasBangladesh = IPTV_COUNTRIES.some((c) => c.code === "bd");
    expect(hasBangladesh).toBe(true);

    const hasNews = IPTV_CATEGORIES.some((c) => c.id === "news");
    expect(hasNews).toBe(true);
  });

  it("returns fallback channels when fetch fails or is simulated", async () => {
    // Mock fetch to simulate failure
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));

    const result = await getIPTVChannels({ limit: 10 });
    expect(result).toBeDefined();
    expect(result.channels.length).toBeGreaterThan(0);
    expect(result.channels.length).toBeLessThanOrEqual(10);
    expect(result.total).toBeGreaterThan(0);
  });

  it("filters channels by category", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));

    const newsResult = await getIPTVChannels({ category: "news" });
    expect(newsResult.channels.length).toBeGreaterThan(0);
    for (const ch of newsResult.channels) {
      expect(ch.group.toLowerCase()).toContain("news");
    }
  });

  it("filters channels by search query", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));

    const searchResult = await getIPTVChannels({ search: "Sky News" });
    expect(searchResult.channels.length).toBeGreaterThan(0);
    expect(searchResult.channels[0].name).toContain("Sky News");
  });
});

