"use client";

import { useEffect } from "react";
import { sendAnalyticsPing } from "@/lib/analytics/client";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence/tracker";

/**
 * Site-wide background analytics & presence tracker.
 * Mounts in RootLayout to report active session heartbeats, country geography,
 * and visitor counts without blocking rendering.
 */
export function AnalyticsTracker() {
  useEffect(() => {
    sendAnalyticsPing("ping");

    const interval = setInterval(() => {
      sendAnalyticsPing("ping");
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendAnalyticsPing("ping");
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        sendAnalyticsPing("ping");
      }
    };

    const handleBeforeUnload = () => {
      sendAnalyticsPing("leave");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      sendAnalyticsPing("leave");
    };
  }, []);

  return null;
}
