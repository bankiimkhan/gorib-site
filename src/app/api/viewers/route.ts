import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PresenceTracker, type PresenceAction } from "@/lib/presence/tracker";

export const dynamic = "force-dynamic";

// "Watching now" lives in the PresenceCounter Durable Object (binding PRESENCE) when
// deployed, so every Worker isolate shares one count. This in-process tracker is the
// fallback for `next dev` and tests, where there is a single process anyway.
const localPresence = new PresenceTracker();

// All-time unique visitors. Persisted in D1 (binding VISITORS_DB) when deployed;
// falls back to process memory in local dev and tests where no binding exists.
const memoryVisitors = new Set<string>();

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
};
type D1Like = {
  prepare(query: string): D1Statement;
  exec(query: string): Promise<unknown>;
  batch<T = unknown>(statements: D1Statement[]): Promise<{ results: T[] }[]>;
};

type DurableObjectStubLike = { fetch(url: string, init?: RequestInit): Promise<Response> };
type DurableObjectNamespaceLike = {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
};

type WorkerEnv = { VISITORS_DB?: D1Like; PRESENCE?: DurableObjectNamespaceLike };

let schemaReady: Promise<unknown> | null = null;

function getWorkerEnv(): WorkerEnv {
  try {
    return getCloudflareContext().env as unknown as WorkerEnv;
  } catch {
    return {};
  }
}

/** Reports a heartbeat/leave to the shared presence counter and returns the live count. */
async function updatePresence(sessionId: unknown, action: PresenceAction | null): Promise<number> {
  const namespace = getWorkerEnv().PRESENCE;
  if (!namespace) {
    return action ? localPresence.update(sessionId, action) : localPresence.count();
  }

  try {
    const stub = namespace.get(namespace.idFromName("global"));
    const res = await stub.fetch("https://presence/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action ? { sessionId, action } : {}),
    });
    const data = (await res.json()) as { count?: unknown };
    if (typeof data.count === "number") return data.count;
  } catch (err) {
    console.error("[viewers] presence counter unavailable:", err);
  }
  // Never fall back to the per-isolate tracker here: it would show a misleading partial count.
  return 1;
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
const SELECT_TOTAL = "SELECT value FROM stats WHERE name = 'total_visitors'";

/** Records a visitor (once per id) and returns the all-time unique visitor count. */
export async function recordVisitor(visitorId?: string): Promise<number | null> {
  const validId = visitorId && VISITOR_ID_PATTERN.test(visitorId) ? visitorId : null;
  const db = getWorkerEnv().VISITORS_DB;

  if (!db) {
    if (validId) memoryVisitors.add(validId);
    return memoryVisitors.size;
  }

  try {
    await ensureSchema(db);
    if (!validId) {
      const row = await db.prepare(SELECT_TOTAL).first<{ value: number }>();
      return row?.value ?? null;
    }
    // One batch = one transaction: the counter only moves when the insert added a row
    // (changes() is 0 for an ignored duplicate), and can't drift if a later step fails.
    const results = await db.batch<{ value: number }>([
      db.prepare("INSERT OR IGNORE INTO visitors (id, first_seen) VALUES (?, ?)").bind(validId, Date.now()),
      db.prepare("UPDATE stats SET value = value + changes() WHERE name = 'total_visitors'"),
      db.prepare(SELECT_TOTAL),
    ]);
    return results[2]?.results[0]?.value ?? null;
  } catch (err) {
    console.error("[viewers] visitor total unavailable:", err);
    return null;
  }
}

/** Test helper: clears the in-process fallbacks. */
export function resetActiveSessions(): void {
  localPresence.clear();
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
  const [count, total] = await Promise.all([updatePresence(undefined, null), recordVisitor()]);
  return viewersResponse(count, total);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, visitorId, action } = (body || {}) as {
      sessionId?: unknown;
      visitorId?: unknown;
      action?: unknown;
    };
    const presenceAction: PresenceAction = action === "leave" ? "leave" : "ping";

    if (presenceAction === "leave") {
      return viewersResponse(await updatePresence(sessionId, "leave"), null);
    }

    const [count, total] = await Promise.all([
      updatePresence(sessionId, "ping"),
      recordVisitor(typeof visitorId === "string" ? visitorId : undefined),
    ]);
    return viewersResponse(count, total);
  } catch {
    return NextResponse.json({ count: 1 }, { headers: NO_CACHE_HEADERS });
  }
}
