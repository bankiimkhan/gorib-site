import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AdEventType, AdPlacement, AdProviderType } from "./types";
import type { AdPerformanceStat } from "@/lib/analytics/types";

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
};

type D1Like = {
  prepare(query: string): D1Statement;
  exec(query: string): Promise<unknown>;
};

let schemaReady: Promise<unknown> | null = null;

function getDb(): D1Like | undefined {
  try {
    return (getCloudflareContext().env as unknown as { VISITORS_DB?: D1Like }).VISITORS_DB;
  } catch {
    return undefined;
  }
}

function ensureSchema(db: D1Like): Promise<unknown> {
  if (!schemaReady) {
    schemaReady = db
      .exec(
        "CREATE TABLE IF NOT EXISTS ad_event_metrics (occurred_on TEXT NOT NULL, placement TEXT NOT NULL, provider TEXT NOT NULL, event_type TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (occurred_on, placement, provider, event_type));"
      )
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

const EMPTY: AdPerformanceStat = {
  period: "today (UTC)",
  requests: 0,
  filled: 0,
  viewable: 0,
  unfilled: 0,
  blocked: 0,
  fillRate: 0,
  viewabilityRate: 0,
};

const PERSISTED_EVENTS = new Set<AdEventType>(["request", "filled", "viewable", "unfilled", "blocked", "error"]);

export async function recordAdEvent(input: {
  type: AdEventType;
  placement: AdPlacement;
  provider: AdProviderType;
}): Promise<void> {
  if (!PERSISTED_EVENTS.has(input.type)) return;
  const db = getDb();
  if (!db) return;
  try {
    await ensureSchema(db);
    const occurredOn = new Date().toISOString().slice(0, 10);
    await db
      .prepare(
        "INSERT INTO ad_event_metrics (occurred_on, placement, provider, event_type, count) VALUES (?, ?, ?, ?, 1) ON CONFLICT(occurred_on, placement, provider, event_type) DO UPDATE SET count = count + 1"
      )
      .bind(occurredOn, input.placement, input.provider, input.type)
      .run();
  } catch (error) {
    console.error("[ads] aggregate event record error:", error);
  }
}

/** Provider-agnostic operational metrics; revenue is intentionally excluded until a provider report is imported. */
export async function getAdPerformance(): Promise<AdPerformanceStat> {
  const db = getDb();
  if (!db) return EMPTY;
  try {
    await ensureSchema(db);
    const occurredOn = new Date().toISOString().slice(0, 10);
    const rows = await db
      .prepare("SELECT event_type, SUM(count) AS count FROM ad_event_metrics WHERE occurred_on = ? GROUP BY event_type")
      .bind(occurredOn)
      .all<{ event_type: string; count: number }>();
    const metrics = new Map(rows.results.map((row) => [row.event_type, row.count]));
    const requests = metrics.get("request") || 0;
    const filled = metrics.get("filled") || 0;
    const viewable = metrics.get("viewable") || 0;
    return {
      period: "today (UTC)",
      requests,
      filled,
      viewable,
      unfilled: metrics.get("unfilled") || 0,
      blocked: metrics.get("blocked") || 0,
      fillRate: requests ? Number(((filled / requests) * 100).toFixed(1)) : 0,
      viewabilityRate: filled ? Number(((viewable / filled) * 100).toFixed(1)) : 0,
    };
  } catch (error) {
    console.error("[ads] aggregate summary error:", error);
    return EMPTY;
  }
}
