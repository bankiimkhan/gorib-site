import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { AdSlot } from "@/components/ads/AdSlot";

describe("AdSlot Component", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    sessionStorage.clear();
    delete process.env.NEXT_PUBLIC_AD_MAX_REQUESTS_PER_PAGE;
    delete process.env.NEXT_PUBLIC_AD_MAX_REQUESTS_PER_SESSION;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("renders null and creates zero DOM nodes when ads are globally disabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "false";
    process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED = "false";
    const { container } = render(<AdSlot placement="home-top" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an accessible ad placement placeholder when ads are enabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_PROVIDER = "placeholder";
    const { container } = render(<AdSlot placement="home-top" priority />);
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Sponsored Area");
    expect(container.textContent).toContain("home-top");

    const slot = container.querySelector('[data-ad-placement="home-top"]');
    expect(slot).not.toBeNull();
    expect(slot?.getAttribute("role")).toBe("region");
    expect(slot?.getAttribute("aria-label")).toContain("Advertisement slot: home-top");
  });

  it("respects individual placement disabling even when ads are globally enabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_HOME_FEED = "false";

    const { container } = render(<AdSlot placement="home-feed" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders custom programmatic container when NEXT_PUBLIC_AD_PROVIDER is custom", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_PROVIDER = "custom";
    process.env.NEXT_PUBLIC_CUSTOM_AD_SCRIPT_URL = "https://unfoldedtrade.com/test";
    process.env.NEXT_PUBLIC_CUSTOM_AD_DISPLAY_ONLY_APPROVED = "true";

    const { container } = render(<AdSlot placement="home-top" priority />);
    expect(container.firstChild).not.toBeNull();
    const customSlot = container.querySelector('[data-custom-placement="home-top"]');
    expect(customSlot).not.toBeNull();
  });
});
