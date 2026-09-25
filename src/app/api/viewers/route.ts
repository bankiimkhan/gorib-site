import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

// In-memory sliding window for active visitor sessions
// Maps sessionId -> last active timestamp (ms)
const activeSessions = new Map<string, number>();
const SESSION_TIMEOUT_MS = 35_000; // 35 seconds inactivity window

// All-time unique visitors. Persisted in D1 (binding VISITORS_DB) when deployed;
// falls back to process memory in local dev and tests where no binding exists.
const memoryVisitors = new Set<string>();

type D1Result = { meta?: { changes?: number } };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<D1Result>;
  first<T>(): Promise<T | null>;
};
type D1Like = { prepare(query: string): D1Statement; exec(query: string): Promise<unknown> };

let schemaReady: Promise<unknown> | null = null;

function getVisitorsDb(): D1Like | null {
  try {
    const env = getCloudflareContext().env as unknown as { VISITORS_DB?: D1Like };
    return env.VISITORS_DB ?? null;
  } catch {
    return null;
  }
}

function ensureSchema(db: D1Like): Promise<unknown> {
  if (!schemaReady) {
    schemaReady = db
      .exec(
        // D1 exec() splits statements on newlines
        "CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY, first_seen INTEGER NOT NULL);\n" +
          "CREATE TABLE IF NOT EXISTS stats (name TEXT PRIMARY KEY, value INTEGER NOT NULL);\n" +
          "INSERT OR IGNORE INTO stats (name, value) VALUES ('total_visitors', 0);"
      )
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/** Records a visitor (once per id) and returns the all-time unique visitor count. */
export async function recordVisitor(visitorId?: string): Promise<number | null> {
  const validId = visitorId && VISITOR_ID_PATTERN.test(visitorId) ? visitorId : null;
  const db = getVisitorsDb();

  if (!db) {
    if (validId) memoryVisitors.add(validId);
    return memoryVisitors.size;
  }

  try {
    await ensureSchema(db);
    if (validId) {
      const inserted = await db
        .prepare("INSERT OR IGNORE INTO visitors (id, first_seen) VALUES (?, ?)")
        .bind(validId, Date.now())
        .run();
      if (inserted.meta?.changes) {
        await db.prepare("UPDATE stats SET value = value + 1 WHERE name = 'total_visitors'").run();
      }
    }
    const row = await db.prepare("SELECT value FROM stats WHERE name = 'total_visitors'").first<{ value: number }>();
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function cleanupAndCount(): number {
  const now = Date.now();
  for (const [id, timestamp] of activeSessions.entries()) {
    if (now - timestamp > SESSION_TIMEOUT_MS) {
      activeSessions.delete(id);
    }
  }
  return activeSessions.size;
}

export function resetActiveSessions(): void {
  activeSessions.clear();
  memoryVisitors.clear();
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function viewersResponse(count: number, total: number | null) {
  return NextResponse.json(
    { count: Math.max(1, count), ...(total !== null && { total: Math.max(1, total) }) },
    { headers: NO_CACHE_HEADERS }
  );
}

export async function GET() {
  const count = cleanupAndCount();
  const total = await recordVisitor();
  return viewersResponse(count, total);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, visitorId, action } = (body || {}) as {
      sessionId?: string;
      visitorId?: string;
      action?: string;
    };
    const now = Date.now();

    if (sessionId && typeof sessionId === "string") {
      if (action === "leave") {
        activeSessions.delete(sessionId);
      } else {
        activeSessions.set(sessionId, now);
      }
    }

    const count = cleanupAndCount();
    if (action === "leave") {
      return viewersResponse(count, null);
    }

    const total = await recordVisitor(typeof visitorId === "string" ? visitorId : undefined);
    return viewersResponse(count, total);
  } catch {
    return NextResponse.json({ count: 1 });
  }
}
