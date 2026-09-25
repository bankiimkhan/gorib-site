import { PresenceTracker, type PresenceAction } from "../lib/presence/tracker";

// Minimal slice of the Durable Object state API used here (workers-types isn't installed).
export interface PresenceStorage {
  list<T = unknown>(options: { prefix: string }): Promise<Map<string, T>>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
}
export interface PresenceState {
  storage: PresenceStorage;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

const KEY_PREFIX = "session:";

/**
 * Durable Object holding the site-wide "watching now" count.
 *
 * Every Worker isolate talks to the same instance (idFromName("global")), so
 * the count covers all visitors rather than whichever isolate a request hit.
 *
 * Sessions are persisted because the runtime evicts idle objects from memory
 * (and restarts them on deploy), which would otherwise silently drop everyone
 * still watching. Storage is written on join, leave and expiry, and at most once
 * per PERSIST_INTERVAL_MS per session in between, never on every heartbeat.
 *
 * Exported from custom-worker.mjs and bound as PRESENCE in wrangler.jsonc.
 */
export class PresenceCounter {
  private tracker: PresenceTracker;

  constructor(state: PresenceState) {
    const { storage } = state;
    // Output gates make the response wait for these writes, so no await is needed.
    this.tracker = new PresenceTracker({
      onPersist: (id, lastSeen) => void storage.put(KEY_PREFIX + id, lastSeen),
      onRemove: (id) => void storage.delete(KEY_PREFIX + id),
    });

    void state.blockConcurrencyWhile(async () => {
      const stored = await storage.list<number>({ prefix: KEY_PREFIX });
      this.tracker.restore([...stored].map(([key, lastSeen]) => [key.slice(KEY_PREFIX.length), lastSeen]));
    });
  }

  async fetch(request: Request): Promise<Response> {
    let action: PresenceAction = "ping";
    let sessionId: unknown;

    if (request.method === "POST") {
      const body = (await request.json().catch(() => null)) as { sessionId?: unknown; action?: unknown } | null;
      sessionId = body?.sessionId;
      if (body?.action === "leave") action = "leave";
    }

    const count = sessionId === undefined ? this.tracker.count() : this.tracker.update(sessionId, action);
    return Response.json({ count });
  }
}
