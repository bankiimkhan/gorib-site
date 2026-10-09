export type AdPlacement =
  | "home-top"
  | "home-feed"
  | "catalog-header"
  | "catalog-in-feed"
  | "details-mid"
  | "player-bottom"
  | "search-banner"
  | "live-tv-banner"
  | "mobile-sticky"
  // Legacy aliases for backward compatibility
  | "details"
  | "search";

export type AdProviderType =
  | "placeholder"
  | "custom";

export type PlaceholderMode = "debug" | "sponsor" | "minimal";

export interface AdPlacementDimensions {
  desktop: { width: number | string; height: number };
  mobile: { width: number | string; height: number };
  minHeightClass: string;
  maxWidthClass: string;
}

export interface AdEventData {
  placement: AdPlacement;
  provider: AdProviderType;
  timestamp: number;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * `impression` is retained for compatibility with existing listeners. New
 * code should distinguish a demand request, a filled slot, and a viewable
 * creative instead of treating all three as an impression.
 */
export type AdEventType =
  | "request"
  | "filled"
  | "viewable"
  | "unfilled"
  | "suppressed"
  | "impression"
  | "click"
  | "blocked"
  | "error";
