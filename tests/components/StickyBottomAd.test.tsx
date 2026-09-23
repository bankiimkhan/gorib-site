import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { StickyBottomAd } from "@/components/ads/StickyBottomAd";

let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("StickyBottomAd Component", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockPathname = "/";
    sessionStorage.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("renders null when ads are disabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "false";
    const { container } = render(<StickyBottomAd />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null by default when mobile-sticky is not explicitly enabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    delete process.env.NEXT_PUBLIC_AD_MOBILE_STICKY;

    const { container } = render(<StickyBottomAd />);
    expect(container.firstChild).toBeNull();
  });

  it("renders mobile sticky banner when ads and placement are active", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_MOBILE_STICKY = "true";

    const { container } = render(<StickyBottomAd />);
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector('[data-testid="mobile-sticky-ad"]')).not.toBeNull();
    expect(container.querySelector('[data-ad-placement="mobile-sticky"]')).not.toBeNull();
  });

  it("dismisses sticky banner and sets sessionStorage when close button is clicked", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_MOBILE_STICKY = "true";

    const { container, getByLabelText } = render(<StickyBottomAd />);
    const closeBtn = getByLabelText("Dismiss advertisement");
    fireEvent.click(closeBtn);

    expect(container.firstChild).toBeNull();
    expect(sessionStorage.getItem("gorib_sticky_ad_dismissed")).toBe("true");
  });

  it("automatically hides on /watch routes to avoid covering player controls", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    process.env.NEXT_PUBLIC_AD_MOBILE_STICKY = "true";
    mockPathname = "/watch/movie/123";

    const { container } = render(<StickyBottomAd />);
    expect(container.firstChild).toBeNull();
  });
});
