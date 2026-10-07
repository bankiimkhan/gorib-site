import { NextRequest, NextResponse } from "next/server";
import {
  getAnalyticsSummary,
  recordPing,
  recordLeave,
  recordWatch,
} from "@/lib/analytics/store";
import { detectCountryFromHeaders } from "@/lib/analytics/countries";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
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
      isReturning,
      seconds,
      mediaType,
      title,
    } = body || {};

    const detectedCountry =
      typeof country === "string" && country.length === 2
        ? country
        : detectCountryFromHeaders(req.headers);

    if (action === "leave") {
      if (typeof sessionId === "string") {
        await recordLeave(sessionId);
      }
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    if (action === "watch") {
      if (typeof visitorId === "string" && typeof sessionId === "string" && typeof seconds === "number") {
        await recordWatch({
          visitorId,
          sessionId,
          seconds,
          mediaType: mediaType === "tv" || mediaType === "live" ? mediaType : "movie",
          title: typeof title === "string" ? title : "Unknown Title",
          country: detectedCountry,
        });
      }
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
    }

    // Default: ping
    if (typeof visitorId === "string" && typeof sessionId === "string") {
      const result = await recordPing({
        visitorId,
        sessionId,
        country: detectedCountry,
        isReturning: Boolean(isReturning),
      });
      return NextResponse.json(result, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error("[analytics route] POST error:", err);
    return NextResponse.json({ success: false }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
