import { AdPlacement, AdProviderType, PlaceholderMode, AdPlacementDimensions } from "./types";

export interface AdSystemConfig {
  enabled: boolean;
  provider: AdProviderType;
  placeholderMode: PlaceholderMode;
  lazyLoadOffsetPx: number;
  placements: Record<AdPlacement, boolean>;
  adsense?: {
    clientId: string;
    slots: Partial<Record<AdPlacement, string>>;
  };
  customScript?: {
    scriptUrl?: string;
    containerHtml?: string;
    /**
     * Whether the custom script is a pure display/banner tag that is safe to run
     * on pages hosting the video player. Multitags that bundle popunders or
     * iframe click-capture overlays must leave this false (the default).
     */
    playerSafe?: boolean;
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

  const provider = (process.env.NEXT_PUBLIC_AD_PROVIDER as AdProviderType) || "placeholder";
  const placeholderMode =
    (process.env.NEXT_PUBLIC_AD_PLACEHOLDER_MODE as PlaceholderMode) ||
    (process.env.NODE_ENV === "production" ? "sponsor" : "debug");

  // Helper to read per-placement flag with configurable default
  const isPlacementEnabled = (envVar: string | undefined, defaultVal = true): boolean => {
    if (envVar === "true") return true;
    if (envVar === "false") return false;
    return defaultVal;
  };

  return {
    enabled: isGloballyEnabled,
    provider,
    placeholderMode,
    lazyLoadOffsetPx: 250,
    placements: {
      // Conservative initial production experiment: 4 active placements
      "home-top": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_HOME_TOP, true),
      "home-feed": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_HOME_FEED, true),
      "details-mid": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_DETAILS_MID, true),
      "player-bottom": isPlacementEnabled(process.env.NEXT_PUBLIC_AD_PLAYER_BOTTOM, true),
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
    adsense: {
      clientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
      slots: {
        "home-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP,
        "home-feed": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_FEED,
        "catalog-header": process.env.NEXT_PUBLIC_ADSENSE_SLOT_CATALOG_HEADER,
        "details-mid": process.env.NEXT_PUBLIC_ADSENSE_SLOT_DETAILS,
        "player-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_PLAYER_BOTTOM,
        "search-banner": process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH,
        "live-tv-banner": process.env.NEXT_PUBLIC_ADSENSE_SLOT_LIVE_TV,
      },
    },
    customScript: {
      scriptUrl: process.env.NEXT_PUBLIC_CUSTOM_AD_SCRIPT_URL,
      playerSafe: process.env.NEXT_PUBLIC_CUSTOM_AD_PLAYER_SAFE === "true",
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
 * - adsense: display units only (keep Auto ads / anchors off for /watch in the AdSense dashboard).
 * - custom: only when explicitly declared a banner-only tag.
 */
export function isProviderPlayerSafe(config: AdSystemConfig = getAdConfig()): boolean {
  switch (config.provider) {
    case "custom":
      return Boolean(config.customScript?.playerSafe);
    case "adsense":
    case "placeholder":
    default:
      return true;
  }
}

/**
 * CSS selector listing the in-page containers a custom multitag may fill.
 * Player-page placements are never included.
 */
export function getCustomAppendToSelector(config: AdSystemConfig = getAdConfig()): string {
  return (Object.keys(config.placements) as AdPlacement[])
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

