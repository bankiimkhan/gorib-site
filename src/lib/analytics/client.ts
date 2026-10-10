"use client";

import { useSyncExternalStore } from "react";
import { PersonalAnalytics } from "./types";
import { countryCodeToFlag, getCountryName } from "./countries";
import { hasMeasurementConsent } from "@/lib/privacy/consent";

const VISITOR_ID_KEY = "gorib_visitor_id";
const VISIT_COUNT_KEY = "gorib_visit_count";
const PERSONAL_WATCH_KEY = "gorib_personal_watch_seconds";
const SESSION_ACTIVE_KEY = "gorib_session_active";
const startedMediaInSession = new Set<string>();

/** Get or create persistent visitor ID */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/** Get or create per-tab session ID */
let cachedSessionId: string | null = null;
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  if (cachedSessionId) return cachedSessionId;
  try {
    let id = sessionStorage.getItem("gorib_session_id");
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("gorib_session_id", id);
    }
    cachedSessionId = id;
    return id;
  } catch {
    cachedSessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return cachedSessionId;
  }
}

/** Check if returning user & increment session visit count */
export function initializeSession(): { visitCount: number; isReturning: boolean } {
  if (typeof window === "undefined") return { visitCount: 1, isReturning: false };
  try {
    const rawCount = localStorage.getItem(VISIT_COUNT_KEY);
    let count = rawCount ? parseInt(rawCount, 10) || 1 : 1;

    const sessionActive = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    if (!sessionActive) {
      if (rawCount) {
        count++;
        localStorage.setItem(VISIT_COUNT_KEY, count.toString());
      } else {
        localStorage.setItem(VISIT_COUNT_KEY, "1");
      }
      sessionStorage.setItem(SESSION_ACTIVE_KEY, "1");
    }

    return {
      visitCount: count,
      isReturning: count > 1,
    };
  } catch {
    return { visitCount: 1, isReturning: false };
  }
}

/** Guess client country from timezone or language */
export function detectClientCountry(): string {
  if (typeof window === "undefined") return "US";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Dhaka")) return "BD";
    if (tz.includes("Kolkata") || tz.includes("Calcutta")) return "IN";
    if (tz.includes("New_York") || tz.includes("Chicago") || tz.includes("Los_Angeles")) return "US";
    if (tz.includes("London")) return "GB";
    if (tz.includes("Toronto") || tz.includes("Vancouver")) return "CA";
    if (tz.includes("Sydney") || tz.includes("Melbourne")) return "AU";
    if (tz.includes("Dubai")) return "AE";
    if (tz.includes("Riyadh")) return "SA";
    if (tz.includes("Singapore")) return "SG";
    if (tz.includes("Kuala_Lumpur")) return "MY";
    if (tz.includes("Berlin") || tz.includes("Frankfurt")) return "DE";

    const lang = navigator.language || "";
    if (lang.includes("bn")) return "BD";
    if (lang.includes("hi")) return "IN";
    if (lang.includes("en-GB")) return "GB";
    if (lang.includes("en-CA")) return "CA";
    if (lang.includes("en-AU")) return "AU";
  } catch {
    // ignore
  }
  return "US";
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function postJson(url: string, payload: string, preferBeacon = false): Promise<void> {
  if (preferBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    return Promise.resolve();
  }
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    cache: "no-store",
    keepalive: preferBeacon,
  }).then(() => undefined);
}

/** Send an analytics heartbeat or explicitly close its local live-session fallback. */
export async function sendAnalyticsPing(action: "ping" | "leave" = "ping") {
  if (typeof window === "undefined") return;
  // A leave is permitted after opt-out solely to remove a previously recorded
  // active session. Every measurement event is otherwise gated before IDs are read.
  if (action !== "leave" && !hasMeasurementConsent()) return;
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  initializeSession();
  const country = detectClientCountry();

  const payload = JSON.stringify({
    action,
    visitorId,
    sessionId,
    country,
  });

  try {
    await postJson("/api/analytics", payload, action === "leave");
  } catch {
    // Offline/error
  }
}

/**
 * Presence is intentionally more frequent than analytics persistence. The
 * durable counter needs a responsive heartbeat; D1 session metadata does not.
 */
export async function sendPresencePing(action: "ping" | "leave" = "ping") {
  if (typeof window === "undefined") return;
  if (action !== "leave" && !hasMeasurementConsent()) return;
  const payload = JSON.stringify({
    action,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
  });
  try {
    await postJson("/api/viewers", payload, action === "leave");
  } catch {
    // Offline/error
  }
}

/** Records one privacy-minimised route category per session, never a full URL or query string. */
export async function sendAnalyticsPageView(pageType: AnalyticsPageType) {
  if (typeof window === "undefined" || !hasMeasurementConsent()) return;
  try {
    await postJson(
      "/api/analytics",
      JSON.stringify({
        action: "pageview",
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        country: detectClientCountry(),
        pageType,
      })
    );
  } catch {
    // Offline/error
  }
}

export type AnalyticsPageType = "home" | "catalog" | "details" | "player" | "search" | "live" | "other";

export function getAnalyticsPageType(pathname: string): AnalyticsPageType {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/watch/")) return "player";
  if (pathname === "/live-tv" || pathname.startsWith("/live-tv/")) return "live";
  if (pathname.startsWith("/movie/") || pathname.startsWith("/tv/")) return "details";
  if (pathname.startsWith("/search")) return "search";
  if (pathname === "/movies" || pathname === "/tv" || pathname.startsWith("/genre/")) return "catalog";
  return "other";
}

/** Record watched seconds from player */
export async function sendAnalyticsWatch(
  seconds: number,
  mediaType: "movie" | "tv" | "live",
  title: string,
  mediaId?: string
) {
  if (typeof window === "undefined" || seconds <= 0 || !hasMeasurementConsent()) return;
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const country = detectClientCountry();

  // Accumulate in personal local stats
  try {
    const current = parseInt(localStorage.getItem(PERSONAL_WATCH_KEY) || "0", 10) || 0;
    localStorage.setItem(PERSONAL_WATCH_KEY, (current + seconds).toString());
    window.dispatchEvent(new Event("gorib_personal_watch_change"));
  } catch {
    // Storage blocked
  }

  const payload = JSON.stringify({
    action: "watch",
    visitorId,
    sessionId,
    seconds,
    mediaType,
    title,
    mediaId,
    country,
    eventId: newEventId(),
  });

  try {
    await postJson("/api/analytics", payload);
  } catch {
    // Offline/error
  }
}

/** Record one verified playback start per title and browser session. */
export async function sendAnalyticsStart(
  mediaType: "movie" | "tv" | "live",
  title: string,
  mediaId?: string
) {
  if (typeof window === "undefined" || !hasMeasurementConsent()) return;

  const sessionId = getSessionId();
  const startKey = `${sessionId}\u0000${mediaId || `${mediaType}:${title}`}`;
  if (startedMediaInSession.has(startKey)) return;
  startedMediaInSession.add(startKey);

  const payload = JSON.stringify({
    action: "start",
    visitorId: getVisitorId(),
    sessionId,
    mediaType,
    title,
    mediaId,
    country: detectClientCountry(),
  });

  try {
    await postJson("/api/analytics", payload);
  } catch {
    // Offline/error
  }
}

/** Read personal stats for current viewer */
export function getPersonalAnalytics(): PersonalAnalytics {
  if (typeof window === "undefined") {
    return {
      visitorId: "",
      visitCount: 1,
      isReturning: false,
      watchMinutes: 0,
      country: "US",
      countryName: "United States",
      countryFlag: "🇺🇸",
    };
  }

  if (!hasMeasurementConsent()) return DEFAULT_PERSONAL;

  const visitorId = getVisitorId();
  const { visitCount, isReturning } = initializeSession();
  const country = detectClientCountry();

  let watchSeconds = 0;
  try {
    watchSeconds = parseInt(localStorage.getItem(PERSONAL_WATCH_KEY) || "0", 10) || 0;
  } catch {
    // ignore
  }

  return {
    visitorId,
    visitCount,
    isReturning,
    watchMinutes: Math.round(watchSeconds / 60),
    country,
    countryName: getCountryName(country),
    countryFlag: countryCodeToFlag(country),
  };
}

const DEFAULT_PERSONAL: PersonalAnalytics = {
  visitorId: "",
  visitCount: 1,
  isReturning: false,
  watchMinutes: 0,
  country: "US",
  countryName: "United States",
  countryFlag: "🇺🇸",
};

let cachedPersonalSnapshot: PersonalAnalytics = DEFAULT_PERSONAL;
let cachedWatchSeconds = -1;
let cachedVisitCount = -1;

function getPersonalSnapshot(): PersonalAnalytics {
  if (typeof window === "undefined") return DEFAULT_PERSONAL;
  if (!hasMeasurementConsent()) return DEFAULT_PERSONAL;
  const watchSeconds = parseInt(localStorage.getItem(PERSONAL_WATCH_KEY) || "0", 10) || 0;
  const rawCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "1", 10) || 1;
  if (
    watchSeconds === cachedWatchSeconds &&
    rawCount === cachedVisitCount &&
    cachedPersonalSnapshot !== DEFAULT_PERSONAL
  ) {
    return cachedPersonalSnapshot;
  }
  cachedWatchSeconds = watchSeconds;
  cachedVisitCount = rawCount;
  cachedPersonalSnapshot = getPersonalAnalytics();
  return cachedPersonalSnapshot;
}

function getServerPersonalSnapshot(): PersonalAnalytics {
  return DEFAULT_PERSONAL;
}

function subscribePersonal(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("gorib_personal_watch_change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("gorib_personal_watch_change", callback);
  };
}

/** Hook to listen to personal stats updates */
export function usePersonalAnalytics(): PersonalAnalytics {
  return useSyncExternalStore(subscribePersonal, getPersonalSnapshot, getServerPersonalSnapshot);
}
