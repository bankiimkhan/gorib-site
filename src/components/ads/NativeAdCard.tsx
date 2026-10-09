"use client";

import React, { useCallback, useState } from "react";
import { isPlacementActive } from "@/lib/ads/adConfig";
import { AdSlot } from "./AdSlot";

interface NativeAdCardProps {
  className?: string;
}

/**
 * In-feed programmatic ad card designed to slot seamlessly into movie/TV grids.
 * Matches 2:3 aspect ratio of MediaCard while maintaining clear, compliant display disclosure.
 * Strictly non-affiliate: renders the configured Hilltop display provider.
 */
export function NativeAdCard({ className = "" }: NativeAdCardProps) {
  const [isPolicySuppressed, setIsPolicySuppressed] = useState(false);
  const active = isPlacementActive("catalog-in-feed") && !isPolicySuppressed;
  const handlePolicySuppressed = useCallback(() => setIsPolicySuppressed(true), []);

  if (!active) {
    return null;
  }

  return (
    <div
      className={`group relative flex flex-col transition-all duration-300 ${className}`}
      role="region"
      aria-label="Sponsored advertisement"
      data-ad-placement="catalog-in-feed"
    >
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex gap-2" aria-hidden="true">
        <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-fg-muted">
          Sponsored
        </span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-fg-subtle">Ad</span>
      </div>
      <AdSlot
        placement="catalog-in-feed"
        className="my-0 px-0"
        onPolicySuppressed={handlePolicySuppressed}
      />

      {/* Meta text beneath card, aligned with MediaCard */}
      <p className="mt-2 px-0.5 text-[13px] font-medium text-fg-subtle sm:text-sm">Advertisement</p>
    </div>
  );
}
