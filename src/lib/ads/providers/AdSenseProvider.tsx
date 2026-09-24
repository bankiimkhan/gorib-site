"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdPlacement } from "../types";
import { getAdConfig, PLACEMENT_DIMENSIONS } from "../adConfig";
import { loadAdScript } from "../scriptLoader";
import { trackAdEvent } from "../adAnalytics";

interface AdSenseProviderProps {
  placement: AdPlacement;
  className?: string;
  onUnfilled?: () => void;
}

export function AdSenseProvider({ placement, className = "", onUnfilled }: AdSenseProviderProps) {
  const [hasError, setHasError] = useState(false);
  const adRef = useRef<HTMLModElement>(null);
  const config = getAdConfig();
  const clientId = config.adsense?.clientId;
  const slotId = config.adsense?.slots[placement];
  const dimensions = PLACEMENT_DIMENSIONS[placement] || PLACEMENT_DIMENSIONS["home-top"];

  useEffect(() => {
    // Without a client ID the slot renders nothing (handled below).
    if (!clientId) return;

    let isMounted = true;
    const scriptUrl = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      clientId
    )}`;

    // AdSense display units never overlay or intercept other page content.
    loadAdScript(scriptUrl, { crossOrigin: "anonymous" }, { playerSafe: true })
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

  // Collapse when AdSense reports no fill for this unit.
  useEffect(() => {
    const ins = adRef.current;
    if (!ins || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      if (ins.getAttribute("data-ad-status") === "unfilled") {
        setHasError(true);
      }
    });
    observer.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (hasError || !clientId) onUnfilled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasError, clientId]);

  if (hasError || !clientId) {
    return null;
  }

  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-md bg-white/[0.02] text-center ${dimensions.minHeightClass} ${className}`}
    >
      <div className="pointer-events-none absolute top-1 right-2 text-[9px] font-medium uppercase tracking-widest text-fg-subtle">
        Ad
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

