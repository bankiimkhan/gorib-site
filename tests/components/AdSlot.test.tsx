import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { AdSlot } from "@/components/ads/AdSlot";

describe("AdSlot Component", () => {
  const originalEnv = process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED;

  afterEach(() => {
    process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED = originalEnv;
  });

  it("renders null and creates zero DOM nodes when AD_SLOTS_ENABLED is false", () => {
    process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED = "false";
    const { container } = render(<AdSlot placement="home-top" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an accessible ad placement placeholder when AD_SLOTS_ENABLED is true", () => {
    process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED = "true";
    const { container } = render(<AdSlot placement="home-top" />);
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Sponsored Area");
    expect(container.textContent).toContain("home-top");
  });
});

