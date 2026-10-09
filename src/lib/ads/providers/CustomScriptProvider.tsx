"use client";

import React, { useEffect, useRef } from "react";
import { AdPlacement } from "../types";
import {
  getAdConfig,
  getCustomAppendToSelector,
  isProviderPlayerSafe,
  PLACEMENT_DIMENSIONS,
} from "../adConfig";
import { loadAdScript } from "../scriptLoader";
import { trackAdEvent } from "../adAnalytics";

/** How long a slot may stay empty before it is collapsed (blocked / no fill). */
const FILL_TIMEOUT_MS = 8000;

interface CustomScriptProviderProps {
  placement: AdPlacement;
  className?: string;
  onFilled?: () => void;
  onUnfilled?: () => void;
}

export function CustomScriptProvider({ placement, className = "", onFilled, onUnfilled }: CustomScriptProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const filledReportedRef = useRef(false);
  const config = getAdConfig();
  const scriptUrl = config.customScript?.scriptUrl;
  const dimensions = PLACEMENT_DIMENSIONS[placement] || PLACEMENT_DIMENSIONS["home-top"];

  useEffect(() => {
    if (!scriptUrl) {
      trackAdEvent("unfilled", placement, "custom", { reason: "missing-script" });
      onUnfilled?.();
      return;
    }

    let isMounted = true;
    const el = containerRef.current;
    const hasCreative = () =>
      Boolean(el && Array.from(el.children).some((c) => !c.hasAttribute("data-ad-label")));
    const reportFilled = () => {
      if (filledReportedRef.current || !hasCreative()) return;
      filledReportedRef.current = true;
      onFilled?.();
    };
    const observer = el && typeof MutationObserver !== "undefined" ? new MutationObserver(reportFilled) : null;
    if (el && observer) {
      observer.observe(el, { childList: true, subtree: true });
      reportFilled();
    }

    // Collapse the slot if the network never fills it (ad blockers, no inventory).
    const timer = window.setTimeout(() => {
      if (isMounted && !hasCreative()) {
        trackAdEvent("unfilled", placement, "custom", { reason: "timeout" });
        onUnfilled?.();
      }
    }, FILL_TIMEOUT_MS);

    loadAdScript(
      scriptUrl,
      { referrerPolicy: "no-referrer-when-downgrade" },
      { playerSafe: isProviderPlayerSafe(config), appendTo: getCustomAppendToSelector(config, placement) }
    ).then((success) => {
      if (!isMounted) return;
      if (!success) {
        trackAdEvent("blocked", placement, "custom");
        onUnfilled?.();
        return;
      }
    });

    return () => {
      isMounted = false;
      observer?.disconnect();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptUrl, placement, onFilled, onUnfilled]);

  return (
    <div
      ref={containerRef}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-md bg-white/[0.02] ${dimensions.minHeightClass} ${className}`}
      data-custom-placement={placement}
    >
      <span
        data-ad-label
        className="pointer-events-none absolute top-1 right-2 text-[9px] font-medium uppercase tracking-widest text-fg-subtle"
      >
        Ad
      </span>
    </div>
  );
}
