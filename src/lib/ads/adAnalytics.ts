import { AdEventData, AdEventType, AdPlacement, AdProviderType } from "./types";

/**
 * Dispatches privacy-conscious ad event.
 * Compatible with any standard event listener, Google Tag Manager, Umami, Plausible, or custom backend.
 */
export function trackAdEvent(
  type: AdEventType,
  placement: AdPlacement,
  provider: AdProviderType,
  metadata?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined") return;

  const eventData: AdEventData = {
    placement,
    provider,
    timestamp: Date.now(),
    metadata,
  };

  // Dispatch custom browser event
  try {
    const customEvent = new CustomEvent("gorib:ad_event", {
      detail: { type, ...eventData },
      bubbles: true,
    });
    window.dispatchEvent(customEvent);
  } catch {
    // Fail silently in unsupported environments
  }

  // Developer mode logging
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_AD_DEBUG === "true") {
    console.debug(`[AdAnalytics] ${type.toUpperCase()} on "${placement}" (${provider})`, metadata || "");
  }
}

