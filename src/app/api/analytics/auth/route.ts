import { NextRequest, NextResponse } from "next/server";
import {
  ANALYTICS_SESSION_COOKIE,
  analyticsSessionCookieOptions,
  hasAnalyticsAccess,
} from "@/lib/analytics/admin";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";

  if (!token || token.length > 512 || !(await hasAnalyticsAccess(token))) {
    return NextResponse.json({ error: "Invalid analytics access token" }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  const response = NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  response.cookies.set(ANALYTICS_SESSION_COOKIE, token, analyticsSessionCookieOptions);
  return response;
}

export function DELETE() {
  const response = NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  response.cookies.set(ANALYTICS_SESSION_COOKIE, "", { ...analyticsSessionCookieOptions, maxAge: 0 });
  return response;
}
