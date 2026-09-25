import { describe, it, expect } from "vitest";
import { PresenceTracker, SESSION_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS, PERSIST_INTERVAL_MS } from "@/lib/presence/tracker";
import { PresenceCounter, type PresenceState } from "@/worker/PresenceCounter";

describe("PresenceTracker", () => {
  it("counts distinct sessions and ignores repeat pings", () => {
    const t = new PresenceTracker();
    t.update("tab-a", "ping", 0);
    t.update("tab-a", "ping", 1_000);
    expect(t.update("tab-b", "ping", 2_000)).toBe(2);
  });

  it("removes a session on leave", () => {
    const t = new PresenceTracker();
    t.update("tab-a", "ping", 0);
    t.update("tab-b", "ping", 0);
    expect(t.update("tab-b", "leave", 1)).toBe(1);
  });

  it("keeps a session alive across a throttled background-tab heartbeat", () => {
    const t = new PresenceTracker();
    t.update("tab-a", "ping", 0);
    // Hidden tabs may only get one timer tick per minute.
    expect(t.count(60_000)).toBe(1);
  });

  it("expires sessions that stop heartbeating", () => {
    const t = new PresenceTracker();
    t.update("tab-a", "ping", 0);
    expect(t.count(SESSION_TIMEOUT_MS + 1)).toBe(0);
  });

  it("outlasts several missed heartbeats", () => {
    expect(SESSION_TIMEOUT_MS).toBeGreaterThan(4 * HEARTBEAT_INTERVAL_MS);
  });

  it("persists on join, then at most once per persist interval", () => {
    const persisted: number[] = [];
    const t = new PresenceTracker({ onPersist: (_id, ts) => persisted.push(ts) });
    for (let now = 0; now <= 4 * 60_000; now += HEARTBEAT_INTERVAL_MS) t.update("tab-a", "ping", now);
    expect(persisted).toEqual([0, PERSIST_INTERVAL_MS, 2 * PERSIST_INTERVAL_MS]);
  });

  it("does not revive a dead session through repeated restores", () => {
    // Session last persisted at t=0, then its tab vanished without a leave.
    let now = 0;
    let count = 1;
    for (let restart = 0; restart < 20 && count > 0; restart++) {
      now += 10_000; // object evicted and restored every 10s
      const t = new PresenceTracker();
      t.restore([["ghost", 0]], now);
      count = t.count(now);
    }
    expect(count).toBe(0);
    expect(now).toBeLessThanOrEqual(PERSIST_INTERVAL_MS + SESSION_TIMEOUT_MS + 10_000);
  });

  it("keeps a live session through a restore", () => {
    const t = new PresenceTracker();
    t.restore([["tab-a", 100_000]], 150_000);
    expect(t.count(150_000)).toBe(1);
  });

  it("ignores invalid session ids", () => {
    const t = new PresenceTracker();
    expect(t.update("", "ping")).toBe(0);
    expect(t.update("has spaces", "ping")).toBe(0);
    expect(t.update("x".repeat(65), "ping")).toBe(0);
    expect(t.update({ id: 1 }, "ping")).toBe(0);
  });
});

describe("PresenceCounter Durable Object", () => {
  const post = (body: unknown) =>
    new Request("https://presence/", { method: "POST", body: JSON.stringify(body) });

  function fakeState(data = new Map<string, unknown>()): PresenceState & { data: Map<string, unknown>; writes: number } {
    const state = {
      data,
      writes: 0,
      storage: {
        list: async <T,>({ prefix }: { prefix: string }) =>
          new Map([...data].filter(([k]) => k.startsWith(prefix))) as Map<string, T>,
        put: async (key: string, value: unknown) => {
          state.writes++;
          data.set(key, value);
        },
        delete: async (key: string) => {
          state.writes++;
          return data.delete(key);
        },
      },
      blockConcurrencyWhile: <T,>(cb: () => Promise<T>) => cb(),
    };
    return state;
  }

  async function newCounter(state: PresenceState) {
    const counter = new PresenceCounter(state);
    await Promise.resolve(); // let the restore in blockConcurrencyWhile settle
    await Promise.resolve();
    return counter;
  }

  it("shares one count across requests and handles leave", async () => {
    const counter = await newCounter(fakeState());
    await counter.fetch(post({ sessionId: "tab-a", action: "ping" }));
    const two = await (await counter.fetch(post({ sessionId: "tab-b", action: "ping" }))).json();
    expect(two.count).toBe(2);

    const one = await (await counter.fetch(post({ sessionId: "tab-a", action: "leave" }))).json();
    expect(one.count).toBe(1);
  });

  it("returns the current count for a read-only request", async () => {
    const counter = await newCounter(fakeState());
    await counter.fetch(post({ sessionId: "tab-a", action: "ping" }));
    const res = await (await counter.fetch(post({}))).json();
    expect(res.count).toBe(1);
  });

  it("keeps viewers when the object is evicted and recreated", async () => {
    const state = fakeState();
    const first = await newCounter(state);
    await first.fetch(post({ sessionId: "tab-a", action: "ping" }));
    await first.fetch(post({ sessionId: "tab-b", action: "ping" }));

    const second = await newCounter(fakeState(state.data)); // same storage, fresh memory
    const res = await (await second.fetch(post({ sessionId: "tab-a", action: "ping" }))).json();
    expect(res.count).toBe(2);
  });

  it("writes storage on join and leave only, not on every heartbeat", async () => {
    const state = fakeState();
    const counter = await newCounter(state);
    for (let i = 0; i < 5; i++) await counter.fetch(post({ sessionId: "tab-a", action: "ping" }));
    expect(state.writes).toBe(1);
    await counter.fetch(post({ sessionId: "tab-a", action: "leave" }));
    expect(state.writes).toBe(2);
    expect(state.data.size).toBe(0);
  });
});
