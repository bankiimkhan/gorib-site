import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { NativeAdCard } from "@/components/ads/NativeAdCard";

describe("NativeAdCard Component", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("renders null when ads or catalog-in-feed placement are disabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "false";
    const { container } = render(<NativeAdCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null by default when catalog-in-feed is not explicitly enabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    delete process.env.NEXT_PUBLIC_AD_CATALOG_IN_FEED;

    const { container } = render(<NativeAdCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders programmatic in-feed native card with compliant disclosure and aspect ratio", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_CATALOG_IN_FEED = "true";

    const { container } = render(<NativeAdCard />);
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Sponsored");
    expect(container.textContent).toContain("Advertisement");

    const slot = container.querySelector('[data-ad-placement="catalog-in-feed"]');
    expect(slot).not.toBeNull();
    expect(slot?.getAttribute("role")).toBe("region");
  });
});
