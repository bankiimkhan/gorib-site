"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getAnalyticsPageType, sendAnalyticsPageView, sendAnalyticsPing, sendPresencePing } from "@/lib/analytics/client";
import { useMeasurementConsent } from "@/lib/privacy/consent";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence/tracker";

/**
 * Site-wide background analytics & presence tracker.
 * Mounts in RootLayout to report active session heartbeats, country geography,
 * and visitor counts without blocking rendering.
 */
export function AnalyticsTracker() {
  const pathname = usePathname() || "/";
  const consent = useMeasurementConsent();
  const leaveSentRef = useRef(false);

  useEffect(() => {
    if (consent !== "granted") return;

    leaveSentRef.current = false;
    sendAnalyticsPing("ping");
    sendPresencePing("ping");

    const presenceInterval = setInterval(() => {
      // A hidden tab is not an active viewer. It will rejoin immediately when
      // visible, rather than inflating concurrent audience metrics in the
      // background for up to the presence timeout.
      if (document.visibilityState === "visible") sendPresencePing("ping");
    }, HEARTBEAT_INTERVAL_MS);
    const analyticsInterval = setInterval(() => {
      if (document.visibilityState === "visible") sendAnalyticsPing("ping");
    }, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        leaveSentRef.current = false;
        sendAnalyticsPing("ping");
        sendPresencePing("ping");
      } else {
        leaveSentRef.current = true;
        sendAnalyticsPing("leave");
        sendPresencePing("leave");
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        leaveSentRef.current = false;
        sendAnalyticsPing("ping");
        sendPresencePing("ping");
      }
    };

    const handlePageHide = () => {
      if (leaveSentRef.current) return;
      leaveSentRef.current = true;
      sendAnalyticsPing("leave");
      sendPresencePing("leave");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(presenceInterval);
      clearInterval(analyticsInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
      if (!leaveSentRef.current) {
        sendAnalyticsPing("leave");
        sendPresencePing("leave");
      }
    };
  }, [consent]);

  useEffect(() => {
    if (consent === "granted") sendAnalyticsPageView(getAnalyticsPageType(pathname));
  }, [consent, pathname]);

  return null;
}
