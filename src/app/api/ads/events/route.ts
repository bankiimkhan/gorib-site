import { NextRequest, NextResponse } from "next/server";
import { recordAdEvent } from "@/lib/ads/adStore";
import type { AdEventType, AdPlacement, AdProviderType } from "@/lib/ads/types";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = { "Cache-Control": "no-store" };
const EVENT_TYPES = new Set<AdEventType>(["request", "filled", "viewable", "unfilled", "blocked", "error"]);
const PLACEMENTS = new Set<AdPlacement>([
  "home-top", "home-feed", "catalog-header", "catalog-in-feed", "details-mid", "player-bottom", "search-banner", "live-tv-banner", "mobile-sticky", "details", "search",
]);
const PROVIDERS = new Set<AdProviderType>(["custom", "placeholder"]);

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin event rejected" }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  const body = await request.json().catch(() => null) as { type?: unknown; placement?: unknown; provider?: unknown } | null;
  if (!body || !EVENT_TYPES.has(body.type as AdEventType) || !PLACEMENTS.has(body.placement as AdPlacement) || !PROVIDERS.has(body.provider as AdProviderType)) {
    return NextResponse.json({ error: "Invalid ad event" }, { status: 400, headers: NO_CACHE_HEADERS });
  }

  await recordAdEvent({ type: body.type as AdEventType, placement: body.placement as AdPlacement, provider: body.provider as AdProviderType });
  return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
}
