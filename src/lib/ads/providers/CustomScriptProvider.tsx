"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdPlacement } from "../types";
import { getAdConfig, PLACEMENT_DIMENSIONS } from "../adConfig";
import { loadAdScript } from "../scriptLoader";
import { trackAdEvent } from "../adAnalytics";
import { PlaceholderProvider } from "./PlaceholderProvider";

interface CustomScriptProviderProps {
  placement: AdPlacement;
  className?: string;
}

export function CustomScriptProvider({ placement, className = "" }: CustomScriptProviderProps) {
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const config = getAdConfig();
  const scriptUrl = config.customScript?.scriptUrl;
  const dimensions = PLACEMENT_DIMENSIONS[placement] || PLACEMENT_DIMENSIONS["home-top"];

  useEffect(() => {
    if (!scriptUrl) {
      setHasError(true);
      return;
    }

    let isMounted = true;
    loadAdScript(scriptUrl, { referrerPolicy: "no-referrer-when-downgrade" })
      .then((success) => {
        if (!isMounted) return;
        if (!success) {
          trackAdEvent("blocked", placement, "custom");
          setHasError(true);
          return;
        }
        trackAdEvent("impression", placement, "custom");
      })
      .catch(() => {
        if (isMounted) setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [scriptUrl, placement]);

  if (hasError || !scriptUrl) {
    return <PlaceholderProvider placement={placement} mode="sponsor" className={className} />;
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-1 sm:p-2 ${dimensions.minHeightClass} ${className}`}
      data-custom-placement={placement}
    >
      <span className="absolute top-1 right-2 text-[9px] text-zinc-600 uppercase font-mono tracking-widest pointer-events-none">
        Advertisement
      </span>
    </div>
  );
}

