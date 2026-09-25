/**
 * Live "watching now" presence: each open tab heartbeats with a session id,
 * and a session counts until it leaves or goes quiet for SESSION_TIMEOUT_MS.
 *
 * Shared by the PresenceCounter Durable Object (production, one global
 * instance) and the in-process fallback used by `next dev` and tests.
 */

// Background tabs get their timers throttled to about once a minute, so the
// window must outlast that or backgrounded viewers would flicker out.
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const SESSION_TIMEOUT_MS = 75_000;
// How stale a persisted last-seen time may get before it is rewritten. Bounds
// storage writes to one per session per interval instead of one per heartbeat.
export const PERSIST_INTERVAL_MS = 120_000;

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}

export type PresenceAction = "ping" | "leave";

export interface PresenceListener {
  /** Persist this session's last-seen time (on join, then at most every PERSIST_INTERVAL_MS). */
  onPersist?(sessionId: string, lastSeen: number): void;
  /** A session left or timed out. */
  onRemove?(sessionId: string): void;
}

interface Session {
  lastSeen: number;
  persistedAt: number;
}

export class PresenceTracker {
  private sessions = new Map<string, Session>();

  constructor(private listener: PresenceListener = {}) {}

  /**
   * Re-adds persisted sessions without notifying the listener. The stored time can lag
   * the real last heartbeat by up to PERSIST_INTERVAL_MS, so that much grace is given;
   * a session that is really gone still expires rather than being revived forever.
   */
  restore(entries: Iterable<[string, number]>, now = Date.now()): void {
    for (const [id, persistedAt] of entries) {
      if (!isValidSessionId(id) || typeof persistedAt !== "number") continue;
      this.sessions.set(id, { lastSeen: Math.min(now, persistedAt + PERSIST_INTERVAL_MS), persistedAt });
    }
  }

  /** Applies a heartbeat or leave (if the id is valid) and returns the live count. */
  update(sessionId: unknown, action: PresenceAction, now = Date.now()): number {
    if (isValidSessionId(sessionId)) {
      const session = this.sessions.get(sessionId);
      if (action === "leave") {
        if (session) {
          this.sessions.delete(sessionId);
          this.listener.onRemove?.(sessionId);
        }
      } else if (!session) {
        this.sessions.set(sessionId, { lastSeen: now, persistedAt: now });
        this.listener.onPersist?.(sessionId, now);
      } else {
        session.lastSeen = now;
        if (now - session.persistedAt >= PERSIST_INTERVAL_MS) {
          session.persistedAt = now;
          this.listener.onPersist?.(sessionId, now);
        }
      }
    }
    return this.count(now);
  }

  count(now = Date.now()): number {
    for (const [id, session] of this.sessions) {
      if (now - session.lastSeen > SESSION_TIMEOUT_MS) {
        this.sessions.delete(id);
        this.listener.onRemove?.(id);
      }
    }
    return this.sessions.size;
  }

  clear(): void {
    this.sessions.clear();
  }
}
