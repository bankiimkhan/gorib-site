"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdPlacement } from "../types";
import { getAdConfig, PLACEMENT_DIMENSIONS } from "../adConfig";
import { loadAdScript } from "../scriptLoader";
import { trackAdEvent } from "../adAnalytics";
import { PlaceholderProvider } from "./PlaceholderProvider";

interface AdSenseProviderProps {
  placement: AdPlacement;
  className?: string;
}

export function AdSenseProvider({ placement, className = "" }: AdSenseProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const adRef = useRef<HTMLModElement>(null);
  const config = getAdConfig();
  const clientId = config.adsense?.clientId;
  const slotId = config.adsense?.slots[placement];
  const dimensions = PLACEMENT_DIMENSIONS[placement] || PLACEMENT_DIMENSIONS["home-top"];

  useEffect(() => {
    if (!clientId) {
      // If no AdSense client ID configured, fall back gracefully to placeholder
      setHasError(true);
      return;
    }

    let isMounted = true;
    const scriptUrl = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      clientId
    )}`;

    loadAdScript(scriptUrl, { crossOrigin: "anonymous" })
      .then((success) => {
        if (!isMounted) return;
        if (!success) {
          trackAdEvent("blocked", placement, "adsense");
          setHasError(true);
          return;
        }

        try {
          // Push ad configuration to Google AdSense queue
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const win = window as any;
          (win.adsbygoogle = win.adsbygoogle || []).push({});
          setIsLoaded(true);
          trackAdEvent("impression", placement, "adsense");
        } catch (err) {
          trackAdEvent("error", placement, "adsense", { error: String(err) });
          setHasError(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          trackAdEvent("blocked", placement, "adsense");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clientId, slotId, placement]);

  if (hasError || !clientId) {
    return <PlaceholderProvider placement={placement} mode="sponsor" className={className} />;
  }

  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 p-2 text-center ${dimensions.minHeightClass} ${className}`}
    >
      <div className="absolute top-1 right-2 text-[9px] text-zinc-600 uppercase font-mono tracking-widest pointer-events-none">
        Advertisement
      </div>

      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client={clientId}
        data-ad-slot={slotId || undefined}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

