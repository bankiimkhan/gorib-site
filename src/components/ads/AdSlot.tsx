"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdPlacement } from "@/lib/ads/types";
import {
  getAdConfig,
  isPlacementActive,
  isProviderPlayerSafe,
  PLACEMENT_DIMENSIONS,
  PLAYER_PAGE_PLACEMENTS,
} from "@/lib/ads/adConfig";
import { AdProviderRenderer } from "@/lib/ads/providers";
import { trackAdEvent } from "@/lib/ads/adAnalytics";

export type { AdPlacement };

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
  priority?: boolean;
}

/**
 * Production-ready, zero-CLS AdSlot Component.
 * - Centralized feature flags & per-placement controls.
 * - IntersectionObserver lazy-loading (250px buffer).
 * - Provider abstraction (Placeholder, AdSense, Custom).
 * - Layout reservation to prevent Cumulative Layout Shift.
 * - Viewability tracking (50% in viewport for 1 second continuous).
 * - Collapses when the provider is blocked or reports no fill.
 * - Player-page placements only render player-safe providers; nothing is ever
 *   rendered inside or over the video player itself.
 */
export function AdSlot({ placement, className = "", priority = false }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(priority);
  const impressionSentRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const viewableTimerRef = useRef<NodeJS.Timeout | null>(null);

  const config = getAdConfig();
  const active =
    isPlacementActive(placement) &&
    !isCollapsed &&
    (!PLAYER_PAGE_PLACEMENTS.includes(placement) || isProviderPlayerSafe(config));
  const dimensions = PLACEMENT_DIMENSIONS[placement] || PLACEMENT_DIMENSIONS["home-top"];

  // IntersectionObserver for lazy-loading ad assets
  useEffect(() => {
    if (!active || priority || isInView) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${config.lazyLoadOffsetPx}px 0px` }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [active, priority, isInView, config.lazyLoadOffsetPx]);

  // Viewability tracking: in viewport for 1 second continuously (MRC Standard)
  useEffect(() => {
    if (!active || !isInView) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const viewObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!viewableTimerRef.current) {
            viewableTimerRef.current = setTimeout(() => {
              trackAdEvent("viewable", placement, config.provider);
            }, 1000);
          }
        } else {
          if (viewableTimerRef.current) {
            clearTimeout(viewableTimerRef.current);
            viewableTimerRef.current = null;
          }
        }
      },
      { threshold: [0.5] }
    );

    viewObserver.observe(el);

    return () => {
      viewObserver.disconnect();
      if (viewableTimerRef.current) {
        clearTimeout(viewableTimerRef.current);
      }
    };
  }, [active, isInView, placement, config.provider]);

  // Fire initial impression once loaded in view
  useEffect(() => {
    if (active && isInView && !impressionSentRef.current) {
      impressionSentRef.current = true;
      trackAdEvent("impression", placement, config.provider);
    }
  }, [active, isInView, placement, config.provider]);

  if (!active) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-ad-placement={placement}
      data-ad-provider={config.provider}
      className={`mx-auto my-4 sm:my-8 px-4 sm:px-0 flex w-full items-center justify-center transition-opacity duration-300 ${dimensions.minHeightClass} ${dimensions.maxWidthClass} ${className}`}
      role="region"
      aria-label={`Advertisement slot: ${placement}`}
    >
      {isInView ? (
        <AdProviderRenderer
          placement={placement}
          provider={config.provider}
          placeholderMode={config.placeholderMode}
          onUnfilled={() => setIsCollapsed(true)}
        />
      ) : (
        // Blank CLS-safe reservation box while waiting to scroll into view
        <div
          className={`w-full ${dimensions.minHeightClass}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
