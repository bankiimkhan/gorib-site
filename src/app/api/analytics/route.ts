import { NextRequest, NextResponse } from "next/server";
import {
  getAnalyticsSummary,
  recordPing,
  recordLeave,
  recordPageView,
  recordStart,
  recordWatch,
  type AnalyticsPageType,
} from "@/lib/analytics/store";
import { detectCountryFromHeaders } from "@/lib/analytics/countries";
import { ANALYTICS_SESSION_COOKIE, hasAnalyticsAccess } from "@/lib/analytics/admin";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const PAGE_TYPES = new Set<AnalyticsPageType>(["home", "catalog", "details", "player", "search", "live", "other"]);
const isValidId = (value: unknown): value is string => typeof value === "string" && ID_PATTERN.test(value);
const isValidEventId = (value: unknown): value is string => typeof value === "string" && EVENT_ID_PATTERN.test(value);
const isValidTitle = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 240;

export async function GET(req: NextRequest) {
  if (!(await hasAnalyticsAccess(req.cookies.get(ANALYTICS_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_CACHE_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const queryCountry = url.searchParams.get("country");
    const detectedCountry = queryCountry || detectCountryFromHeaders(req.headers);

    const summary = await getAnalyticsSummary(detectedCountry);
    return NextResponse.json(summary, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[analytics route] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      action,
      visitorId,
      sessionId,
      country,
      seconds,
      mediaType,
      title,
      mediaId,
      eventId,
      pageType,
    } = body || {};

    // Cloudflare's edge header is authoritative when available; the browser
    // hint is only a fallback for local development and non-Cloudflare hosts.
    const edgeCountry = req.headers.get("cf-ipcountry")?.trim().toUpperCase();
    const detectedCountry =
      edgeCountry && /^[A-Z]{2}$/.test(edgeCountry)
        ? edgeCountry
        : typeof country === "string" && /^[A-Za-z]{2}$/.test(country)
        ? country.toUpperCase()
        : detectCountryFromHeaders(req.headers);

    if (action === "leave") {
      if (isValidId(sessionId)) {
        await recordLeave(sessionId);
      }
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    if (action === "watch") {
      if (!isValidId(visitorId) || !isValidId(sessionId) || typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0 || seconds > 60 || !isValidTitle(title) || (eventId !== undefined && !isValidEventId(eventId))) {
        return NextResponse.json({ error: "Invalid watch event" }, { status: 400, headers: NO_CACHE_HEADERS });
      }
      await recordWatch({
        visitorId,
        sessionId,
        seconds,
        mediaType: mediaType === "tv" || mediaType === "live" ? mediaType : "movie",
        title,
        mediaId: typeof mediaId === "string" && mediaId.length <= 180 ? mediaId : undefined,
        country: detectedCountry,
        eventId,
      });
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    if (action === "start") {
      if (!isValidId(visitorId) || !isValidId(sessionId) || !isValidTitle(title)) {
        return NextResponse.json({ error: "Invalid playback start" }, { status: 400, headers: NO_CACHE_HEADERS });
      }
      await recordStart({
        visitorId,
        sessionId,
        mediaType: mediaType === "tv" || mediaType === "live" ? mediaType : "movie",
        title,
        mediaId: typeof mediaId === "string" && mediaId.length <= 180 ? mediaId : undefined,
        country: detectedCountry,
      });
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    if (action === "pageview") {
      if (!isValidId(visitorId) || !isValidId(sessionId) || !PAGE_TYPES.has(pageType as AnalyticsPageType)) {
        return NextResponse.json({ error: "Invalid page view" }, { status: 400, headers: NO_CACHE_HEADERS });
      }
      await recordPageView({ visitorId, sessionId, country: detectedCountry, pageType: pageType as AnalyticsPageType });
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    if (action === "ping") {
      if (!isValidId(visitorId) || !isValidId(sessionId)) {
        return NextResponse.json({ error: "Invalid heartbeat" }, { status: 400, headers: NO_CACHE_HEADERS });
      }
      await recordPing({
        visitorId,
        sessionId,
        country: detectedCountry,
      });
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ error: "Unsupported analytics action" }, { status: 400, headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[analytics route] POST error:", err);
    return NextResponse.json({ success: false }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
