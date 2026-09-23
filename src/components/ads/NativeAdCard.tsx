"use client";

import React, { useEffect, useRef } from "react";
import { isPlacementActive, getAdConfig } from "@/lib/ads/adConfig";
import { trackAdEvent } from "@/lib/ads/adAnalytics";
import { AdProviderRenderer } from "@/lib/ads/providers";

interface NativeAdCardProps {
  className?: string;
}

/**
 * In-feed programmatic ad card designed to slot seamlessly into movie/TV grids.
 * Matches 2:3 aspect ratio of MediaCard while maintaining clear, compliant display disclosure.
 * Strictly non-affiliate: renders configured display provider (placeholder, adsense, or custom).
 */
export function NativeAdCard({ className = "" }: NativeAdCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const active = isPlacementActive("catalog-in-feed");
  const config = getAdConfig();

  useEffect(() => {
    if (!active) return;
    trackAdEvent("impression", "catalog-in-feed", config.provider);
  }, [active, config.provider]);

  if (!active) {
    return null;
  }

  return (
    <div
      ref={cardRef}
      className={`group relative flex flex-col transition-all duration-300 ${className}`}
      role="region"
      aria-label="Sponsored advertisement"
      data-ad-placement="catalog-in-feed"
    >
      {/* 2:3 Aspect ratio container matching MediaCard */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-4 shadow-md flex flex-col justify-between transition-all duration-300 group-hover:border-zinc-700">
        {/* Top Badges */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-zinc-400">
            Sponsored
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
            Ad
          </span>
        </div>

        {/* Center Content: Provider Renderer */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center p-2">
          <AdProviderRenderer
            placement="catalog-in-feed"
            provider={config.provider}
            placeholderMode={config.placeholderMode}
          />
        </div>

        {/* Bottom disclosure */}
        <div className="relative z-10 w-full pt-2 text-center">
          <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
            In-Feed Display
          </span>
        </div>
      </div>

      {/* Meta text beneath card */}
      <div className="mt-2.5 px-0.5">
        <h3 className="text-xs font-bold text-zinc-400 truncate">
          Advertisement
        </h3>
        <p className="text-[11px] text-zinc-600 font-medium">
          Sponsored Space
        </p>
      </div>
    </div>
  );
}
