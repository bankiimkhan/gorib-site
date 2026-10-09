import { getAdConfig } from "./adConfig";
import { AdPlacement } from "./types";

const AD_BUDGET_STORAGE_KEY = "gorib_ad_request_budget_v1";

type AdBudget = {
  total: number;
  byPath: Record<string, number>;
};

export type AdSuppressionReason =
  | "mobile-sticky-not-approved"
  | "player-on-compact-screen"
  | "page-budget"
  | "session-budget";

export type AdDecision =
  | { allowed: true }
  | { allowed: false; reason: AdSuppressionReason };

function getBudget(): AdBudget {
  if (typeof window === "undefined") return { total: 0, byPath: {} };

  try {
    const parsed = JSON.parse(sessionStorage.getItem(AD_BUDGET_STORAGE_KEY) || "{}") as Partial<AdBudget>;
    return {
      total: typeof parsed.total === "number" && parsed.total >= 0 ? parsed.total : 0,
      byPath: parsed.byPath && typeof parsed.byPath === "object" ? parsed.byPath : {},
    };
  } catch {
    return { total: 0, byPath: {} };
  }
}

function saveBudget(budget: AdBudget) {
  try {
    sessionStorage.setItem(AD_BUDGET_STORAGE_KEY, JSON.stringify(budget));
  } catch {
    // Storage may be disabled. The slot-level lazy loading remains in effect.
  }
}

function isCompactViewport() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

/**
 * Allocates a request budget only when a slot is about to request demand. This
 * avoids charging a session for below-the-fold placeholders that a visitor
 * never approaches, while protecting against ad-density and repeat-exposure
 * problems across client-side navigation.
 */
export function reserveAdRequest(placement: AdPlacement, pathname: string): AdDecision {
  const config = getAdConfig();

  if (placement === "mobile-sticky" && !config.frequency.allowMobileSticky) {
    return { allowed: false, reason: "mobile-sticky-not-approved" };
  }

  // The player is the primary task on watch pages. Even a below-player unit is
  // withheld on compact screens where playback controls and related content
  // are close together.
  if (placement === "player-bottom" && isCompactViewport()) {
    return { allowed: false, reason: "player-on-compact-screen" };
  }

  const budget = getBudget();
  const pageRequests = budget.byPath[pathname] || 0;
  if (pageRequests >= config.frequency.maxRequestsPerPage) {
    return { allowed: false, reason: "page-budget" };
  }
  if (budget.total >= config.frequency.maxRequestsPerSession) {
    return { allowed: false, reason: "session-budget" };
  }

  const nextBudget: AdBudget = {
    total: budget.total + 1,
    byPath: { ...budget.byPath, [pathname]: pageRequests + 1 },
  };
  saveBudget(nextBudget);
  return { allowed: true };
}

export function getAdPageType(pathname: string):
  | "home"
  | "catalog"
  | "details"
  | "player"
  | "search"
  | "live"
  | "other" {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/watch/")) return "player";
  if (pathname === "/live-tv" || pathname.startsWith("/live-tv/")) return "live";
  if (pathname.startsWith("/movie/") || pathname.startsWith("/tv/")) return "details";
  if (pathname.startsWith("/search")) return "search";
  if (pathname === "/movies" || pathname === "/tv" || pathname.startsWith("/genre/")) return "catalog";
  return "other";
}
