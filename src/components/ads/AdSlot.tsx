"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AdPlacement } from "@/lib/ads/types";
import {
  getAdConfig,
  isPlacementActive,
  isProviderApproved,
  isProviderPlayerSafe,
  PLACEMENT_DIMENSIONS,
  PLAYER_PAGE_PLACEMENTS,
} from "@/lib/ads/adConfig";
import { AdProviderRenderer } from "@/lib/ads/providers";
import { trackAdEvent } from "@/lib/ads/adAnalytics";
import { getAdPageType, reserveAdRequest } from "@/lib/ads/adPolicy";
import { useMeasurementConsent } from "@/lib/privacy/consent";

export type { AdPlacement };

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
  priority?: boolean;
  /** Lets composed layouts remove their own wrapper when policy denies a slot. */
  onPolicySuppressed?: () => void;
}

/**
 * Production-ready, zero-CLS AdSlot Component.
 * - Centralized feature flags & per-placement controls.
 * - IntersectionObserver lazy-loading (250px buffer).
 * - Provider abstraction (Placeholder and Hilltop custom display tag).
 * - Layout reservation to prevent Cumulative Layout Shift.
 * - A per-page and per-session request budget prevents ad-density creep.
 * - Viewability tracking starts only after a provider has confirmed a fill.
 * - Empty slots collapse before they are visible, but retain their reserved
 *   space after visibility so a no-fill result cannot cause a layout shift.
 * - Player-page placements only render player-safe providers; nothing is ever
 *   rendered inside or over the video player itself.
 */
export function AdSlot({ placement, className = "", priority = false, onPolicySuppressed }: AdSlotProps) {
  const pathname = usePathname() || "/";
  const consent = useMeasurementConsent();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(priority);
  const [requestAllowed, setRequestAllowed] = useState(false);
  const decisionMadeRef = useRef(false);
  const [isPolicySuppressed, setIsPolicySuppressed] = useState(false);
  const [isFilled, setIsFilled] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [keepEmptyReservation, setKeepEmptyReservation] = useState(false);
  const viewableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewableSentRef = useRef(false);
  const hasReachedViewportRef = useRef(false);
  const previousPathnameRef = useRef(pathname);

  const config = getAdConfig();
  const active =
    isPlacementActive(placement) &&
    consent === "granted" &&
    !isCollapsed &&
    isProviderApproved(config) &&
    (!PLAYER_PAGE_PLACEMENTS.includes(placement) || isProviderPlayerSafe(config));
  const dimensions = PLACEMENT_DIMENSIONS[placement] || PLACEMENT_DIMENSIONS["home-top"];

  // Sticky units live in the root layout, and a dynamic route can preserve an
  // AdSlot instance. Reset its one-view state when the client route changes.
  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    setRequestAllowed(false);
    decisionMadeRef.current = false;
    setIsPolicySuppressed(false);
    setIsFilled(false);
    setIsCollapsed(false);
    setKeepEmptyReservation(false);
    viewableSentRef.current = false;
    hasReachedViewportRef.current = false;
  }, [pathname]);

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

  // Reserve a request only when the slot approaches the viewport. This makes
  // the budget reflect meaningful content consumption rather than page loads.
  useEffect(() => {
    if (!active || !isInView || decisionMadeRef.current) return;

    const decision = reserveAdRequest(placement, pathname);
    decisionMadeRef.current = true;
    const applyDecision = () => {
      if (!decision.allowed) {
        setIsPolicySuppressed(true);
        onPolicySuppressed?.();
        trackAdEvent("suppressed", placement, config.provider, {
          reason: decision.reason,
          pageType: getAdPageType(pathname),
        });
        return;
      }

      setRequestAllowed(true);
      if (config.provider === "placeholder") setIsFilled(true);
      trackAdEvent("request", placement, config.provider, {
        pageType: getAdPageType(pathname),
        compactViewport:
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(max-width: 767px)").matches,
      });
    };
    const timer = window.setTimeout(applyDecision, 0);
    return () => window.clearTimeout(timer);
  }, [active, config.provider, isInView, onPolicySuppressed, pathname, placement]);

  // Whether the reservation reached the actual viewport (not only the lazy
  // load margin). This is used to avoid collapsing already-seen content.
  useEffect(() => {
    if (!active || !isInView) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          hasReachedViewportRef.current = true;
          observer.disconnect();
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, isInView]);

  const handleFilled = useCallback(() => {
    setIsFilled(true);
  }, []);

  const handleUnfilled = useCallback(() => {
    setIsFilled(false);
    if (hasReachedViewportRef.current) {
      setKeepEmptyReservation(true);
    } else {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!active || !requestAllowed || !isFilled) return;
    trackAdEvent("filled", placement, config.provider, { pageType: getAdPageType(pathname) });
  }, [active, config.provider, isFilled, pathname, placement, requestAllowed]);

  // MRC-style viewability: a filled creative must be at least 50% visible for
  // one continuous second. A reservation or an unfilled unit is never counted.
  useEffect(() => {
    if (!active || !requestAllowed || !isFilled || viewableSentRef.current) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const viewObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry &&
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.5 &&
          document.visibilityState === "visible"
        ) {
          if (!viewableTimerRef.current) {
            viewableTimerRef.current = setTimeout(() => {
              viewableSentRef.current = true;
              viewableTimerRef.current = null;
              trackAdEvent("viewable", placement, config.provider, { pageType: getAdPageType(pathname) });
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

    const cancelIfHidden = () => {
      if (document.visibilityState !== "visible" && viewableTimerRef.current) {
        clearTimeout(viewableTimerRef.current);
        viewableTimerRef.current = null;
      }
    };
    viewObserver.observe(el);
    document.addEventListener("visibilitychange", cancelIfHidden);

    return () => {
      viewObserver.disconnect();
      document.removeEventListener("visibilitychange", cancelIfHidden);
      if (viewableTimerRef.current) {
        clearTimeout(viewableTimerRef.current);
      }
    };
  }, [active, config.provider, isFilled, pathname, placement, requestAllowed]);

  if (!active || isCollapsed || isPolicySuppressed) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-ad-placement={placement}
      data-ad-provider={config.provider}
      data-ad-state={keepEmptyReservation ? "unfilled" : isFilled ? "filled" : requestAllowed ? "requesting" : "reserved"}
      className={`mx-auto my-4 sm:my-8 px-4 sm:px-0 flex w-full items-center justify-center transition-opacity duration-300 ${dimensions.minHeightClass} ${dimensions.maxWidthClass} ${className}`}
      role="region"
      aria-label={`Advertisement slot: ${placement}`}
    >
      {requestAllowed && !keepEmptyReservation ? (
        <AdProviderRenderer
          placement={placement}
          provider={config.provider}
          placeholderMode={config.placeholderMode}
          onFilled={handleFilled}
          onUnfilled={handleUnfilled}
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
