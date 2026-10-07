"use client";

import { useSyncExternalStore } from "react";
import { PersonalAnalytics } from "./types";
import { countryCodeToFlag, getCountryName } from "./countries";

const VISITOR_ID_KEY = "gorib_visitor_id";
const VISIT_COUNT_KEY = "gorib_visit_count";
const PERSONAL_WATCH_KEY = "gorib_personal_watch_seconds";
const SESSION_ACTIVE_KEY = "gorib_session_active";

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

/** Send presence ping or leave */
export async function sendAnalyticsPing(action: "ping" | "leave" = "ping") {
  if (typeof window === "undefined") return;
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const { isReturning } = initializeSession();
  const country = detectClientCountry();

  const payload = JSON.stringify({
    action,
    visitorId,
    sessionId,
    country,
    isReturning,
  });

  if (action === "leave" && typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    navigator.sendBeacon("/api/viewers", blob);
    return;
  }

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      cache: "no-store",
    });
  } catch {
    // Offline/error
  }
}

/** Record watched seconds from player */
export async function sendAnalyticsWatch(
  seconds: number,
  mediaType: "movie" | "tv" | "live",
  title: string
) {
  if (typeof window === "undefined" || seconds <= 0) return;
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
    country,
  });

  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      cache: "no-store",
    });
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
