import { AdPlacement, AdProviderType, PlaceholderMode, AdPlacementDimensions } from "./types";

export interface AdSystemConfig {
  enabled: boolean;
  provider: AdProviderType;
  placeholderMode: PlaceholderMode;
  lazyLoadOffsetPx: number;
  frequency: {
    /** Maximum ad requests made during a single client-side route view. */
    maxRequestsPerPage: number;
    /** Conservative session budget, shared across client-side navigations. */
    maxRequestsPerSession: number;
    /** Fixed mobile formats need an explicit, deliberate opt-in. */
    allowMobileSticky: boolean;
  };
  placements: Record<AdPlacement, boolean>;
  customScript?: {
    scriptUrl?: string;
    containerHtml?: string;
    /**
     * Whether the custom script is a pure display/banner tag that is safe to run
     * on pages hosting the video player. Multitags that bundle popunders or
     * iframe click-capture overlays must leave this false (the default).
     */
    playerSafe?: boolean;
    /**
     * Explicit release approval for an independently reviewed display-only tag.
     * Opaque multitags remain off until the publisher verifies they cannot
     * create pop-ups, redirects, overlays, or other intrusive formats.
     */
    displayOnlyApproved?: boolean;
  };
}

/**
 * Returns current ad system configuration resolved from environment variables.
 */
export function getAdConfig(): AdSystemConfig {
  // Support both new NEXT_PUBLIC_ADS_ENABLED and legacy NEXT_PUBLIC_AD_SLOTS_ENABLED
  const isGloballyEnabled =
    process.env.NEXT_PUBLIC_ADS_ENABLED === "true" ||
    process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED === "true";

  // Hilltop is the only production network configured for this application.
  // Unknown legacy values deliberately fall back to the harmless placeholder.
  const provider: AdProviderType =
    process.env.NEXT_PUBLIC_AD_PROVIDER === "custom" ? "custom" : "placeholder";
  const placeholderMode =
    (process.env.NEXT_PUBLIC_AD_PLACEHOLDER_MODE as PlaceholderMode) ||
    (process.env.NODE_ENV === "production" ? "sponsor" : "debug");

  // Helper to read per-placement flag with configurable default
  const isPlacementEnabled = (envVar: string | undefined, defaultVal = true): boolean => {
    if (envVar === "true") return true;
    if (envVar === "false") return false;
    return defaultVal;
  };

  const readPositiveInteger = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return {
    enabled: isGloballyEnabled,
    provider,
    placeholderMode,
    lazyLoadOffsetPx: 250,
    frequency: {
      // One well-placed unit performs better long-term than competing units on
      // the same view. Both limits can be tuned only after an experiment.
      maxRequestsPerPage: readPositiveInteger(process.env.NEXT_PUBLIC_AD_MAX_REQUESTS_PER_PAGE, 1),
      maxRequestsPerSession: readPositiveInteger(process.env.NEXT_PUBLIC_AD_MAX_REQUESTS_PER_SESSION, 4),
      allowMobileSticky: process.env.NEXT_PUBLIC_AD_ALLOW_MOBILE_STICKY === "true",
    },
    placements: {
      // Sustainable baseline: high-intent discovery contexts only. Additional
      // surfaces must be enabled deliberately and validated with an experiment.
      "home-top": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_HOME_TOP, true),
      "home-feed": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_HOME_FEED, false),
      "details-mid": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_DETAILS_MID, true),
      "player-bottom": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_PLAYER_BOTTOM, false),
      // Initially disabled placements (configurable via env flag)
      "catalog-header": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_CATALOG_HEADER, false),
      "catalog-in-feed": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_CATALOG_IN_FEED, false),
      "search-banner": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_SEARCH, false),
      "live-tv-banner": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_LIVE_TV, false),
      "mobile-sticky": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_MOBILE_STICKY, false),
      // Legacy aliases
      details: isPlacementEnabled(process.env.NEXT_PUBLIC_AD_DETAILS_MID, true),
      search: isPlacementEnabled(process.env.NEXT_PUBLIC_AD_SEARCH, false),
    },
    customScript: {
      scriptUrl: process.env.NEXT_PUBLIC_CUSTOM_AD_SCRIPT_URL,
      playerSafe: process.env.NEXT_PUBLIC_CUSTOM_AD_PLAYER_SAFE === "true",
      displayOnlyApproved: process.env.NEXT_PUBLIC_CUSTOM_AD_DISPLAY_ONLY_APPROVED === "true",
    },
  };
}

/**
 * Checks if a specific placement is active and allowed to render.
 */
export function isPlacementActive(placement: AdPlacement): boolean {
  const config = getAdConfig();
  if (!config.enabled) return false;
  return Boolean(config.placements[placement]);
}

/**
 * Placements that render on pages hosting a video player. They sit below or
 * beside the player, never inside or over it, and only render providers that
 * are player-safe (see `isProviderPlayerSafe`).
 */
export const PLAYER_PAGE_PLACEMENTS: AdPlacement[] = ["player-bottom", "live-tv-banner"];

/**
 * Whether the configured provider can load on a page hosting the video player
 * without being able to overlay, intercept, or redirect player interaction.
 * - placeholder: static markup, no third-party code.
 * - custom: only when explicitly declared a banner-only tag.
 */
export function isProviderPlayerSafe(config: AdSystemConfig = getAdConfig()): boolean {
  switch (config.provider) {
    case "custom":
      return Boolean(config.customScript?.playerSafe);
    case "placeholder":
    default:
      return true;
  }
}

/** A custom tag must be independently approved before any slot may run it. */
export function isProviderApproved(config: AdSystemConfig = getAdConfig()): boolean {
  return config.provider !== "custom" || Boolean(config.customScript?.displayOnlyApproved);
}

/**
 * CSS selector listing the in-page containers a custom multitag may fill.
 * Player-page placements are never included.
 */
export function getCustomAppendToSelector(
  config: AdSystemConfig = getAdConfig(),
  placement?: AdPlacement
): string {
  const placements = placement ? [placement] : (Object.keys(config.placements) as AdPlacement[]);
  return placements
    .filter(
      (p) =>
        config.placements[p] &&
        !PLAYER_PAGE_PLACEMENTS.includes(p) &&
        p !== "details" &&
        p !== "search"
    )
    .map((p) => `[data-custom-placement="${p}"]`)
    .join(", ");
}

/**
 * Canonical dimensions and min-height classes to guarantee zero CLS.
 */
export const PLACEMENT_DIMENSIONS: Record<AdPlacement, AdPlacementDimensions> = {
  "home-top": {
    desktop: { width: 728, height: 90 },
    mobile: { width: 320, height: 50 },
    minHeightClass: "min-h-[50px] sm:min-h-[90px]",
    maxWidthClass: "max-w-[320px] sm:max-w-4xl",
  },
  "home-feed": {
    desktop: { width: 970, height: 250 },
    mobile: { width: 300, height: 250 },
    minHeightClass: "min-h-[250px]",
    maxWidthClass: "max-w-[320px] sm:max-w-5xl",
  },
  "catalog-header": {
    desktop: { width: 728, height: 90 },
    mobile: { width: 320, height: 50 },
    minHeightClass: "min-h-[50px] sm:min-h-[90px]",
    maxWidthClass: "max-w-[320px] sm:max-w-4xl",
  },
  "catalog-in-feed": {
    desktop: { width: "100%", height: 380 },
    mobile: { width: "100%", height: 260 },
    minHeightClass: "aspect-[2/3]",
    maxWidthClass: "w-full",
  },
  "details-mid": {
    desktop: { width: 728, height: 90 },
    mobile: { width: 300, height: 250 },
    minHeightClass: "min-h-[250px] sm:min-h-[90px]",
    maxWidthClass: "max-w-[320px] sm:max-w-4xl",
  },
  "player-bottom": {
    desktop: { width: 728, height: 90 },
    mobile: { width: 320, height: 50 },
    minHeightClass: "min-h-[50px] sm:min-h-[90px]",
    maxWidthClass: "max-w-[320px] sm:max-w-4xl",
  },
  "search-banner": {
    desktop: { width: 728, height: 90 },
    mobile: { width: 320, height: 50 },
    minHeightClass: "min-h-[50px] sm:min-h-[90px]",
    maxWidthClass: "max-w-[320px] sm:max-w-4xl",
  },
  "live-tv-banner": {
    desktop: { width: 728, height: 90 },
    mobile: { width: 320, height: 50 },
    minHeightClass: "min-h-[50px] sm:min-h-[90px]",
    maxWidthClass: "max-w-[320px] sm:max-w-4xl",
  },
  "mobile-sticky": {
    desktop: { width: 0, height: 0 },
    mobile: { width: 320, height: 50 },
    minHeightClass: "min-h-[50px]",
    maxWidthClass: "max-w-[320px]",
  },
  // Legacy aliases
  details: {
    desktop: { width: 728, height: 90 },
    mobile: { width: 300, height: 250 },
    minHeightClass: "min-h-[250px] sm:min-h-[90px]",
    maxWidthClass: "max-w-[320px] sm:max-w-4xl",
  },
  search: {
    desktop: { width: 728, height: 90 },
    mobile: { width: 320, height: 50 },
    minHeightClass: "min-h-[50px] sm:min-h-[90px]",
    maxWidthClass: "max-w-[320px] sm:max-w-4xl",
  },
};

