import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { AdSlot } from "@/components/ads/AdSlot";
import { getAdConfig, getCustomAppendToSelector, isProviderPlayerSafe } from "@/lib/ads/adConfig";
import { loadAdScript } from "@/lib/ads/scriptLoader";
import { hasUnsafeAdScriptLoaded, isPlayerRoute, UNSAFE_AD_SCRIPT_FLAG } from "@/lib/ads/playerRoutes";

const MULTITAG = "https://ads.example.test/multitag.js";

describe("Player ad safety", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_PROVIDER = "custom";
    process.env.NEXT_PUBLIC_CUSTOM_AD_SCRIPT_URL = MULTITAG;
    delete process.env.NEXT_PUBLIC_CUSTOM_AD_PLAYER_SAFE;
    document.head.querySelectorAll("script").forEach((s) => s.remove());
    delete (window as unknown as Record<string, unknown>)[UNSAFE_AD_SCRIPT_FLAG];
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    process.env = originalEnv;
    window.history.replaceState({}, "", "/");
  });

  it("classifies every player-hosting route", () => {
    expect(isPlayerRoute("/watch/movie/1")).toBe(true);
    expect(isPlayerRoute("/watch/tv/1")).toBe(true);
    expect(isPlayerRoute("/live-tv")).toBe(true);
    expect(isPlayerRoute("/movie/1")).toBe(false);
    expect(isPlayerRoute("/watchlist")).toBe(false);
    expect(isPlayerRoute("/")).toBe(false);
  });

  it("treats custom multitags as not player-safe unless declared banner-only", () => {
    expect(isProviderPlayerSafe(getAdConfig())).toBe(false);
    process.env.NEXT_PUBLIC_CUSTOM_AD_PLAYER_SAFE = "true";
    expect(isProviderPlayerSafe(getAdConfig())).toBe(true);
  });

  it("never lets a multitag target player-page containers", () => {
    const selector = getCustomAppendToSelector(getAdConfig());
    expect(selector).toContain('[data-custom-placement="home-top"]');
    expect(selector).not.toContain("player-bottom");
    expect(selector).not.toContain("live-tv-banner");
  });

  it("refuses to inject a non-player-safe script on a watch page", async () => {
    window.history.replaceState({}, "", "/watch/movie/550");
    const loaded = await loadAdScript(MULTITAG);
    expect(loaded).toBe(false);
    expect(document.querySelector(`script[src="${MULTITAG}"]`)).toBeNull();
    expect(hasUnsafeAdScriptLoaded()).toBe(false);
  });

  it("flags the document once a non-player-safe script is injected elsewhere", () => {
    void loadAdScript(MULTITAG);
    expect(document.querySelector(`script[src="${MULTITAG}"]`)).not.toBeNull();
    expect(hasUnsafeAdScriptLoaded()).toBe(true);
  });

  it("renders nothing in the player-bottom slot for a multitag provider", () => {
    const { container } = render(<AdSlot placement="player-bottom" priority />);
    expect(container.firstChild).toBeNull();
  });

  it("still renders player-bottom for a display-only provider below the player", () => {
    process.env.NEXT_PUBLIC_AD_PROVIDER = "placeholder";
    const { container } = render(<AdSlot placement="player-bottom" priority />);
    expect(container.querySelector('[data-ad-placement="player-bottom"]')).not.toBeNull();
  });
});
