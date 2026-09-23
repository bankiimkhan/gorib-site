"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { isPlacementActive } from "@/lib/ads/adConfig";
import { AdSlot } from "./AdSlot";

const DISMISS_STORAGE_KEY = "gorib_sticky_ad_dismissed";

/**
 * Mobile-only sticky bottom banner (320x50 standard IAB anchor).
 * Compliant with Coalition for Better Ads Standards:
 * - Clean, non-intrusive close button ('X').
 * - Respects user dismissal per session.
 * - Auto-hides on player watch pages when fullscreen or active playback is engaged.
 * - Pure programmatic display unit (no affiliate/VPN promotions).
 */
export function StickyBottomAd() {
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(true); // Default true until verified on client
  const [isMounted, setIsMounted] = useState(false);

  const active = isPlacementActive("mobile-sticky");

  useEffect(() => {
    setIsMounted(true);
    try {
      const dismissed = sessionStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissed === "true") {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, "true");
    } catch {
      // Ignore storage errors
    }
  };

  // Don't render if not mounted, not active, already dismissed, or on active player pages
  if (!isMounted || !active || isDismissed) {
    return null;
  }

  // Hide on watch pages to never obstruct player controls or touch targets
  if (pathname?.startsWith("/watch")) {
    return null;
  }

  return (
    <aside
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07090e]/95 backdrop-blur-xl border-t border-zinc-800 shadow-2xl px-3 py-1.5"
      role="complementary"
      aria-label="Mobile sticky advertisement"
      data-testid="mobile-sticky-ad"
    >
      <div className="relative mx-auto flex max-w-sm items-center justify-center">
        {/* Programmatic display slot */}
        <div className="w-full flex justify-center">
          <AdSlot placement="mobile-sticky" className="my-0" priority />
        </div>

        {/* Close dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute -top-1 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800/90 text-zinc-400 hover:text-white transition-colors"
          aria-label="Dismiss advertisement"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
