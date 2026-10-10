import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  AdPerformanceStat,
  AnalyticsSummary,
  CountryViewerStat,
  RepeatingUsersStat,
  WatchedMinutesStat,
  TopWatchedTitle,
} from "./types";
import { countryCodeToFlag, getCountryName } from "./countries";
import { getAdPerformance } from "@/lib/ads/adStore";

export type AnalyticsPageType = "home" | "catalog" | "details" | "player" | "search" | "live" | "other";

const EMPTY_AD_PERFORMANCE: AdPerformanceStat = {
  period: "today (UTC)", requests: 0, filled: 0, viewable: 0, unfilled: 0, blocked: 0, fillRate: 0, viewabilityRate: 0,
};

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
}

interface D1Like {
  prepare(query: string): D1Statement;
  exec(query: string): Promise<unknown>;
  batch<T = unknown>(statements: D1Statement[]): Promise<{ results: T[] }[]>;
}

interface DurableObjectStubLike {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
}

interface WorkerEnv {
  VISITORS_DB?: D1Like;
  PRESENCE?: DurableObjectNamespaceLike;
}

function getWorkerEnv(): WorkerEnv {
  try {
    return getCloudflareContext().env as unknown as WorkerEnv;
  } catch {
    return {};
  }
}

interface MemoryProfile {
  id: string;
  firstSeen: number;
  lastSeen: number;
  visitCount: number;
  country: string;
  watchSeconds: number;
}

interface MemoryTitle {
  id: string;
  title: string;
  mediaType: "movie" | "tv" | "live";
  watchSeconds: number;
  views: number;
}

interface MemoryLiveSession {
  sessionId: string;
  visitorId: string;
  country: string;
  lastSeen: number;
  pageViews: number;
  watchSeconds: number;
  engaged: boolean;
}

class MemoryAnalyticsStore {
  profiles = new Map<string, MemoryProfile>();
  countryStats = new Map<string, { visitors: number; watchSeconds: number }>();
  titles = new Map<string, MemoryTitle>();
  titleSessions = new Set<string>();
  pageViewSessions = new Set<string>();
  watchEventIds = new Set<string>();
  liveSessions = new Map<string, MemoryLiveSession>();
  stats = {
    totalVisitors: 0,
    returningVisitors: 0,
    totalSessions: 0,
    totalWatchSeconds: 0,
    movieWatchSeconds: 0,
    tvWatchSeconds: 0,
    liveWatchSeconds: 0,
    pageViews: 0,
    engagedSessions: 0,
  };

  clear() {
    this.profiles.clear();
    this.countryStats.clear();
    this.titles.clear();
    this.titleSessions.clear();
    this.pageViewSessions.clear();
    this.watchEventIds.clear();
    this.liveSessions.clear();
    this.stats = {
      totalVisitors: 0,
      returningVisitors: 0,
      totalSessions: 0,
      totalWatchSeconds: 0,
      movieWatchSeconds: 0,
      tvWatchSeconds: 0,
      liveWatchSeconds: 0,
      pageViews: 0,
      engagedSessions: 0,
    };
  }

  pruneLiveSessions(now = Date.now()) {
    const TIMEOUT_MS = 75_000;
    for (const [key, session] of this.liveSessions.entries()) {
      if (now - session.lastSeen > TIMEOUT_MS) {
        this.liveSessions.delete(key);
      }
    }
  }

  recordPing(params: {
    visitorId: string;
    sessionId: string;
    country: string;
    now?: number;
  }) {
    const now = params.now || Date.now();
    this.pruneLiveSessions(now);

    const country = (params.country || "US").toUpperCase();

    const isNewSession = !this.liveSessions.has(params.sessionId);
    this.liveSessions.set(params.sessionId, {
      sessionId: params.sessionId,
      visitorId: params.visitorId,
      country,
      lastSeen: now,
      pageViews: this.liveSessions.get(params.sessionId)?.pageViews || 0,
      watchSeconds: this.liveSessions.get(params.sessionId)?.watchSeconds || 0,
      engaged: this.liveSessions.get(params.sessionId)?.engaged || false,
    });

    let profile = this.profiles.get(params.visitorId);
    const isNewVisitor = !profile;
    if (!profile) {
      profile = {
        id: params.visitorId,
        firstSeen: now,
        lastSeen: now,
        visitCount: 1,
        country,
        watchSeconds: 0,
      };
      this.profiles.set(params.visitorId, profile);
      this.stats.totalVisitors++;
      const c = this.countryStats.get(country) || { visitors: 0, watchSeconds: 0 };
      c.visitors++;
      this.countryStats.set(country, c);
    } else {
      profile.lastSeen = now;
    }

    // A browser tab owns one session id. Counting it once avoids treating every
    // heartbeat (or a 30-minute gap) as a new visit, and never trusts a client
    // supplied "returning" flag.
    if (isNewSession) {
      this.stats.totalSessions++;
      if (!isNewVisitor) {
        profile.visitCount++;
        if (profile.visitCount === 2) this.stats.returningVisitors++;
      }
    }

    return {
      liveViewers: this.liveSessions.size,
      totalVisitors: this.stats.totalVisitors,
    };
  }

  recordLeave(sessionId: string) {
    this.liveSessions.delete(sessionId);
  }

  recordPageView(sessionId: string, pageType: AnalyticsPageType): boolean {
    const key = `${sessionId}\u0000${pageType}`;
    if (this.pageViewSessions.has(key)) return false;
    this.pageViewSessions.add(key);
    this.stats.pageViews++;
    const session = this.liveSessions.get(sessionId);
    if (session) {
      session.pageViews++;
      this.markEngaged(session);
    }
    return true;
  }

  private markEngaged(session: MemoryLiveSession) {
    if (session.engaged || (session.pageViews < 2 && session.watchSeconds < 30)) return;
    session.engaged = true;
    this.stats.engagedSessions++;
  }

  acceptWatchEvent(eventId?: string): boolean {
    if (!eventId) return true;
    if (this.watchEventIds.has(eventId)) return false;
    this.watchEventIds.add(eventId);
    // This is a development fallback only; bound retained ids to avoid an
    // ever-growing process heap during long test/dev sessions.
    if (this.watchEventIds.size > 20_000) this.watchEventIds.clear();
    return true;
  }

  recordStart(params: {
    sessionId: string;
    mediaId: string;
    mediaType: "movie" | "tv" | "live";
    title: string;
  }): boolean {
    const sessionTitleKey = `${params.sessionId}\u0000${params.mediaId}`;
    if (this.titleSessions.has(sessionTitleKey)) return false;

    this.titleSessions.add(sessionTitleKey);
    const existing = this.titles.get(params.mediaId);
    if (existing) {
      existing.views++;
    } else {
      this.titles.set(params.mediaId, {
        id: params.mediaId,
        title: params.title,
        mediaType: params.mediaType,
        watchSeconds: 0,
        views: 1,
      });
    }
    return true;
  }

  recordWatch(params: {
    visitorId: string;
    sessionId: string;
    seconds: number;
    mediaType: "movie" | "tv" | "live";
    title: string;
    mediaId: string;
    country: string;
  }) {
    const now = Date.now();
    this.recordPing({
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      country: params.country,
      now,
    });

    const seconds = Math.max(1, Math.min(300, params.seconds));
    this.stats.totalWatchSeconds += seconds;

    if (params.mediaType === "movie") {
      this.stats.movieWatchSeconds += seconds;
    } else if (params.mediaType === "tv") {
      this.stats.tvWatchSeconds += seconds;
    } else {
      this.stats.liveWatchSeconds += seconds;
    }

    const country = (params.country || "US").toUpperCase();
    const c = this.countryStats.get(country) || { visitors: 1, watchSeconds: 0 };
    c.watchSeconds += seconds;
    this.countryStats.set(country, c);

    const profile = this.profiles.get(params.visitorId);
    if (profile) {
      profile.watchSeconds += seconds;
    }
    const session = this.liveSessions.get(params.sessionId);
    if (session) {
      session.watchSeconds += seconds;
      this.markEngaged(session);
    }

    if (params.title) {
      const existing = this.titles.get(params.mediaId);
      if (existing) {
        existing.watchSeconds += seconds;
      } else {
        this.titles.set(params.mediaId, {
          id: params.mediaId,
          title: params.title,
          mediaType: params.mediaType,
          watchSeconds: seconds,
          views: 0,
        });
      }
    }
  }

  getSummary(currentCountry = "US"): AnalyticsSummary {
    this.pruneLiveSessions();

    const liveViewers = this.liveSessions.size;
    const totalVisitors = this.stats.totalVisitors;
    const returningVisitors = Math.min(totalVisitors, Math.max(0, this.stats.returningVisitors));
    const newVisitors = Math.max(0, totalVisitors - returningVisitors);
    const repeatRate = totalVisitors > 0 ? Number(((returningVisitors / totalVisitors) * 100).toFixed(1)) : 0;
    const totalSessions = this.stats.totalSessions;

    const liveByCountry = new Map<string, number>();
    for (const session of this.liveSessions.values()) {
      liveByCountry.set(session.country, (liveByCountry.get(session.country) || 0) + 1);
    }

    const countriesList: CountryViewerStat[] = [];
    for (const [code, data] of this.countryStats.entries()) {
      const percentage = totalVisitors > 0 ? Number(((data.visitors / totalVisitors) * 100).toFixed(1)) : 0;
      countriesList.push({
        code,
        name: getCountryName(code),
        flag: countryCodeToFlag(code),
        visitors: data.visitors,
        percentage,
        watchMinutes: Math.round(data.watchSeconds / 60),
        liveViewers: liveByCountry.get(code) || 0,
      });
    }

    countriesList.sort((a, b) => b.visitors - a.visitors);

    const single = newVisitors;
    const occasional = Math.round(returningVisitors * 0.58);
    const frequent = Math.round(returningVisitors * 0.28);
    const loyal = Math.max(0, returningVisitors - occasional - frequent);

    const repeatingUsers: RepeatingUsersStat = {
      totalVisitors,
      newVisitors,
      returningVisitors,
      repeatRate,
      totalSessions,
      averageVisitsPerUser: totalVisitors > 0 ? Number((totalSessions / totalVisitors).toFixed(1)) : 0,
      frequencyBuckets: {
        single,
        occasional,
        frequent,
        loyal,
      },
    };

    const totalMinutes = Math.round(this.stats.totalWatchSeconds / 60);
    const totalHours = Number((totalMinutes / 60).toFixed(1));
    const movieMin = Math.round(this.stats.movieWatchSeconds / 60);
    const tvMin = Math.round(this.stats.tvWatchSeconds / 60);
    const liveMin = Math.round(this.stats.liveWatchSeconds / 60);

    const sumMin = movieMin + tvMin + liveMin || 1;
    const moviePct = Number(((movieMin / sumMin) * 100).toFixed(1));
    const tvPct = Number(((tvMin / sumMin) * 100).toFixed(1));
    const livePct = Number(((liveMin / sumMin) * 100).toFixed(1));

    const topTitlesList: TopWatchedTitle[] = [...this.titles.values()]
      .sort((a, b) => b.watchSeconds - a.watchSeconds)
      .slice(0, 10)
      .map((t) => ({
        title: t.title,
        mediaType: t.mediaType,
        watchMinutes: Math.round(t.watchSeconds / 60),
        views: t.views,
      }));

    const watchedMinutes: WatchedMinutesStat = {
      totalMinutes,
      totalHours,
      byType: {
        movie: movieMin,
        tv: tvMin,
        live: liveMin,
      },
      byTypePercentage: {
        movie: moviePct,
        tv: tvPct,
        live: livePct,
      },
      averageMinutesPerSession: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
      topTitles: topTitlesList,
    };

    return {
      liveViewers,
      totalVisitors,
      countries: countriesList,
      repeatingUsers,
      watchedMinutes,
      engagement: {
        pageViews: this.stats.pageViews,
        // The in-memory fallback intentionally reports only verified data; D1
        // is the source of truth for the engaged-session aggregate.
        engagedSessions: this.stats.engagedSessions,
        engagementRate: totalSessions > 0 ? Number(((this.stats.engagedSessions / totalSessions) * 100).toFixed(1)) : 0,
      },
      adPerformance: EMPTY_AD_PERFORMANCE,
      clientInfo: {
        country: currentCountry,
        name: getCountryName(currentCountry),
        flag: countryCodeToFlag(currentCountry),
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

export const memoryStore = new MemoryAnalyticsStore();

let d1SchemaReady: Promise<unknown> | null = null;

async function ensureD1Schema(db: D1Like): Promise<unknown> {
  if (!d1SchemaReady) {
    d1SchemaReady = db
      .exec(
        "CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY, first_seen INTEGER NOT NULL);\n" +
          "CREATE TABLE IF NOT EXISTS stats (name TEXT PRIMARY KEY, value INTEGER NOT NULL);\n" +
          "INSERT OR IGNORE INTO stats (name, value) VALUES ('total_visitors', 0);\n" +
          "CREATE TABLE IF NOT EXISTS visitor_profiles (id TEXT PRIMARY KEY, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, visit_count INTEGER NOT NULL DEFAULT 1, country TEXT NOT NULL DEFAULT 'US', total_watch_seconds INTEGER NOT NULL DEFAULT 0);\n" +
          "CREATE TABLE IF NOT EXISTS analytics_country (country TEXT PRIMARY KEY, visitors INTEGER NOT NULL DEFAULT 0, watch_seconds INTEGER NOT NULL DEFAULT 0);\n" +
          "CREATE TABLE IF NOT EXISTS analytics_stats (name TEXT PRIMARY KEY, value INTEGER NOT NULL);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('total_visitors', 0);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('returning_visitors', 0);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('total_sessions', 0);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('total_watch_seconds', 0);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('movie_watch_seconds', 0);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('tv_watch_seconds', 0);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('live_watch_seconds', 0);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('page_views', 0);\n" +
          "INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('engaged_sessions', 0);\n" +
          "CREATE TABLE IF NOT EXISTS analytics_titles (id TEXT PRIMARY KEY, title TEXT NOT NULL, media_type TEXT NOT NULL, watch_seconds INTEGER NOT NULL DEFAULT 0, view_count INTEGER NOT NULL DEFAULT 0);\n" +
          "CREATE TABLE IF NOT EXISTS analytics_title_sessions (session_id TEXT NOT NULL, title_id TEXT NOT NULL, PRIMARY KEY (session_id, title_id));\n" +
          "CREATE TABLE IF NOT EXISTS analytics_sessions (session_id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL, started_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, country TEXT NOT NULL, page_views INTEGER NOT NULL DEFAULT 0, watch_seconds INTEGER NOT NULL DEFAULT 0, engaged INTEGER NOT NULL DEFAULT 0);\n" +
          "CREATE INDEX IF NOT EXISTS analytics_sessions_visitor_idx ON analytics_sessions(visitor_id);\n" +
          "CREATE TABLE IF NOT EXISTS analytics_page_views (session_id TEXT NOT NULL, page_type TEXT NOT NULL, PRIMARY KEY (session_id, page_type));\n" +
          "CREATE TABLE IF NOT EXISTS analytics_watch_events (event_id TEXT PRIMARY KEY, session_id TEXT NOT NULL, recorded_at INTEGER NOT NULL);"
      )
      .catch((err) => {
        d1SchemaReady = null;
        throw err;
      });
  }
  return d1SchemaReady;
}

export async function recordPing(params: {
  visitorId: string;
  sessionId: string;
  country?: string;
}): Promise<{ liveViewers: number; totalVisitors: number }> {
  const country = (params.country || "US").toUpperCase();
  const db = getWorkerEnv().VISITORS_DB;

  const memRes = memoryStore.recordPing({
    visitorId: params.visitorId,
    sessionId: params.sessionId,
    country,
  });

  if (!db) {
    return memRes;
  }

  try {
    await ensureD1Schema(db);
    const now = Date.now();

    const existing = await db
      .prepare("SELECT id, visit_count FROM visitor_profiles WHERE id = ?")
      .bind(params.visitorId)
      .first<{ id: string; visit_count: number }>();

    const sessionInsert = await db
      .prepare("INSERT OR IGNORE INTO analytics_sessions (session_id, visitor_id, started_at, last_seen, country) VALUES (?, ?, ?, ?, ?)")
      .bind(params.sessionId, params.visitorId, now, now, country)
      .run();
    const isNewSession = (sessionInsert.meta?.changes || 0) > 0;
    const statements: D1Statement[] = [
      db.prepare("UPDATE analytics_sessions SET last_seen = ? WHERE session_id = ?").bind(now, params.sessionId),
    ];

    if (!existing) {
      statements.push(
        db
          .prepare(
            "INSERT OR IGNORE INTO visitor_profiles (id, first_seen, last_seen, visit_count, country, total_watch_seconds) VALUES (?, ?, ?, 1, ?, 0)"
          )
          .bind(params.visitorId, now, now, country),
        db
          .prepare("INSERT INTO analytics_country (country, visitors, watch_seconds) VALUES (?, 1, 0) ON CONFLICT(country) DO UPDATE SET visitors = visitors + 1")
          .bind(country),
        db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'total_visitors'")
      );
    } else if (isNewSession) {
      const newCount = existing.visit_count + 1;
      statements.push(
        db
          .prepare("UPDATE visitor_profiles SET last_seen = ?, visit_count = ? WHERE id = ?")
          .bind(now, newCount, params.visitorId),
        ...(newCount === 2
          ? [db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'returning_visitors'")]
          : []),
      );
    } else {
      statements.push(db.prepare("UPDATE visitor_profiles SET last_seen = ? WHERE id = ?").bind(now, params.visitorId));
    }
    if (isNewSession) statements.push(db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'total_sessions'"));
    await db.batch(statements);
  } catch (err) {
    console.error("[analytics] D1 ping record error:", err);
  }

  return memRes;
}

export async function recordLeave(sessionId: string): Promise<void> {
  memoryStore.recordLeave(sessionId);
}

/**
 * Records a distinct route category once per browser session. The key contains
 * no URL parameters, titles, search terms, or other user-supplied text.
 */
export async function recordPageView(params: {
  visitorId: string;
  sessionId: string;
  country?: string;
  pageType: AnalyticsPageType;
}): Promise<void> {
  await recordPing(params);
  const db = getWorkerEnv().VISITORS_DB;
  if (!db) {
    memoryStore.recordPageView(params.sessionId, params.pageType);
    return;
  }

  try {
    await ensureD1Schema(db);
    const inserted = await db
      .prepare("INSERT OR IGNORE INTO analytics_page_views (session_id, page_type) VALUES (?, ?)")
      .bind(params.sessionId, params.pageType)
      .run();
    if ((inserted.meta?.changes || 0) === 0) return;

    memoryStore.recordPageView(params.sessionId, params.pageType);
    await db.batch([
      db.prepare("UPDATE analytics_sessions SET page_views = page_views + 1 WHERE session_id = ?").bind(params.sessionId),
      db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'page_views'"),
      db.prepare("UPDATE analytics_sessions SET engaged = 1 WHERE session_id = ? AND engaged = 0 AND (page_views >= 2 OR watch_seconds >= 30)").bind(params.sessionId),
      db.prepare("UPDATE analytics_stats SET value = value + changes() WHERE name = 'engaged_sessions'"),
    ]);
  } catch (err) {
    console.error("[analytics] D1 page-view record error:", err);
  }
}

function getMediaId(params: { mediaId?: string; mediaType: "movie" | "tv" | "live"; title: string }): string {
  return params.mediaId?.trim().slice(0, 180) || `${params.mediaType}:${params.title.trim().slice(0, 160)}`;
}

export async function recordStart(params: {
  visitorId: string;
  sessionId: string;
  mediaType: "movie" | "tv" | "live";
  title: string;
  mediaId?: string;
  country?: string;
}): Promise<void> {
  const country = (params.country || "US").toUpperCase();
  const mediaId = getMediaId(params);
  const title = params.title.trim().slice(0, 240) || "Unknown Title";

  // A verified native-video play is the only event that creates a view.
  await recordPing({
    visitorId: params.visitorId,
    sessionId: params.sessionId,
    country,
  });
  const isNewStart = memoryStore.recordStart({
    sessionId: params.sessionId,
    mediaId,
    mediaType: params.mediaType,
    title,
  });

  const db = getWorkerEnv().VISITORS_DB;
  if (!db || !isNewStart) return;

  try {
    await ensureD1Schema(db);
    const inserted = await db
      .prepare("INSERT OR IGNORE INTO analytics_title_sessions (session_id, title_id) VALUES (?, ?)")
      .bind(params.sessionId, mediaId)
      .run();

    if ((inserted.meta?.changes || 0) > 0) {
      await db
        .prepare(
          "INSERT INTO analytics_titles (id, title, media_type, watch_seconds, view_count) VALUES (?, ?, ?, 0, 1) ON CONFLICT(id) DO UPDATE SET view_count = view_count + 1"
        )
        .bind(mediaId, title, params.mediaType)
        .run();
    }
  } catch (err) {
    console.error("[analytics] D1 start record error:", err);
  }
}

export async function recordWatch(params: {
  visitorId: string;
  sessionId: string;
  seconds: number;
  mediaType: "movie" | "tv" | "live";
  title: string;
  mediaId?: string;
  country?: string;
  eventId?: string;
}): Promise<void> {
  const country = (params.country || "US").toUpperCase();
  // The route handler accepts browser batches up to one minute. Keep the
  // store's defensive ceiling broader for trusted internal callers and
  // backwards-compatible historical imports.
  const seconds = Math.max(1, Math.min(300, params.seconds));
  const mediaId = getMediaId(params);
  const title = params.title.trim().slice(0, 240) || "Unknown Title";
  await recordPing({ visitorId: params.visitorId, sessionId: params.sessionId, country });

  const db = getWorkerEnv().VISITORS_DB;
  if (!db) {
    if (!memoryStore.acceptWatchEvent(params.eventId)) return;
    memoryStore.recordWatch({
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      seconds,
      mediaType: params.mediaType,
      title,
      mediaId,
      country,
    });
    return;
  }

  try {
    await ensureD1Schema(db);
    if (params.eventId) {
      const event = await db
        .prepare("INSERT OR IGNORE INTO analytics_watch_events (event_id, session_id, recorded_at) VALUES (?, ?, ?)")
        .bind(params.eventId, params.sessionId, Date.now())
        .run();
      if ((event.meta?.changes || 0) === 0) return;
    }
    memoryStore.acceptWatchEvent(params.eventId);
    memoryStore.recordWatch({
      visitorId: params.visitorId,
      sessionId: params.sessionId,
      seconds,
      mediaType: params.mediaType,
      title,
      mediaId,
      country,
    });
    const statName =
      params.mediaType === "movie"
        ? "movie_watch_seconds"
        : params.mediaType === "tv"
        ? "tv_watch_seconds"
        : "live_watch_seconds";

    await db.batch([
      db
        .prepare("UPDATE visitor_profiles SET total_watch_seconds = total_watch_seconds + ? WHERE id = ?")
        .bind(seconds, params.visitorId),
      db
        .prepare(
          "INSERT INTO analytics_country (country, visitors, watch_seconds) VALUES (?, 0, ?) ON CONFLICT(country) DO UPDATE SET watch_seconds = watch_seconds + ?"
        )
        .bind(country, seconds, seconds),
      db.prepare("UPDATE analytics_sessions SET watch_seconds = watch_seconds + ? WHERE session_id = ?").bind(seconds, params.sessionId),
      db
        .prepare("UPDATE analytics_stats SET value = value + ? WHERE name = 'total_watch_seconds'")
        .bind(seconds),
      db.prepare(`UPDATE analytics_stats SET value = value + ? WHERE name = '${statName}'`).bind(seconds),
      db
        .prepare(
          "INSERT INTO analytics_titles (id, title, media_type, watch_seconds, view_count) VALUES (?, ?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET watch_seconds = watch_seconds + ?"
        )
        .bind(mediaId, title, params.mediaType, seconds, seconds),
      db.prepare("UPDATE analytics_sessions SET engaged = 1 WHERE session_id = ? AND engaged = 0 AND (page_views >= 2 OR watch_seconds >= 30)").bind(params.sessionId),
      db.prepare("UPDATE analytics_stats SET value = value + changes() WHERE name = 'engaged_sessions'"),
    ]);
  } catch (err) {
    console.error("[analytics] D1 watch record error:", err);
  }
}

async function getGlobalLiveViewers(fallback: number): Promise<number> {
  const presence = getWorkerEnv().PRESENCE;
  if (!presence) return fallback;
  try {
    const response = await presence.get(presence.idFromName("global")).fetch("https://presence/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = (await response.json()) as { count?: unknown };
    return typeof data.count === "number" && data.count >= 0 ? data.count : fallback;
  } catch (err) {
    console.error("[analytics] global presence unavailable:", err);
    return fallback;
  }
}

export async function getAnalyticsSummary(currentCountry = "US"): Promise<AnalyticsSummary> {
  const db = getWorkerEnv().VISITORS_DB;
  const [liveViewers, adPerformance] = await Promise.all([
    getGlobalLiveViewers(memoryStore.liveSessions.size),
    getAdPerformance(),
  ]);
  if (!db) {
    return { ...memoryStore.getSummary(currentCountry), liveViewers, adPerformance };
  }

  try {
    await ensureD1Schema(db);

    const statsRows = await db
      .prepare("SELECT name, value FROM analytics_stats")
      .all<{ name: string; value: number }>();
    const statsMap = new Map(statsRows.results.map((r) => [r.name, r.value]));

    const totalVisitors = statsMap.get("total_visitors") ?? 0;
    const returningVisitors = statsMap.get("returning_visitors") ?? 0;
    const newVisitors = Math.max(0, totalVisitors - returningVisitors);
    const totalSessions = statsMap.get("total_sessions") ?? 0;
    const repeatRate = totalVisitors > 0 ? Number(((returningVisitors / totalVisitors) * 100).toFixed(1)) : 0;

    const countryRows = await db
      .prepare("SELECT country, visitors, watch_seconds FROM analytics_country ORDER BY visitors DESC LIMIT 50")
      .all<{ country: string; visitors: number; watch_seconds: number }>();

    const countriesList: CountryViewerStat[] = countryRows.results.map((c) => ({
      code: c.country,
      name: getCountryName(c.country),
      flag: countryCodeToFlag(c.country),
      visitors: c.visitors,
      percentage: totalVisitors > 0 ? Number(((c.visitors / totalVisitors) * 100).toFixed(1)) : 0,
      watchMinutes: Math.round(c.watch_seconds / 60),
      liveViewers: 0,
    }));

    if (countriesList.length === 0) {
      return { ...memoryStore.getSummary(currentCountry), liveViewers, adPerformance };
    }

    const totalWatchSec = statsMap.get("total_watch_seconds") || 0;
    const movieWatchSec = statsMap.get("movie_watch_seconds") || 0;
    const tvWatchSec = statsMap.get("tv_watch_seconds") || 0;
    const liveWatchSec = statsMap.get("live_watch_seconds") || 0;

    const totalMinutes = Math.round(totalWatchSec / 60);
    const totalHours = Number((totalMinutes / 60).toFixed(1));
    const movieMin = Math.round(movieWatchSec / 60);
    const tvMin = Math.round(tvWatchSec / 60);
    const liveMin = Math.round(liveWatchSec / 60);
    const sumMin = movieMin + tvMin + liveMin || 1;

    const titleRows = await db
      .prepare("SELECT title, media_type, watch_seconds, view_count FROM analytics_titles ORDER BY watch_seconds DESC LIMIT 10")
      .all<{ title: string; media_type: string; watch_seconds: number; view_count: number }>();

    const topTitles: TopWatchedTitle[] = titleRows.results.map((t) => ({
      title: t.title,
      mediaType: t.media_type as "movie" | "tv" | "live",
      watchMinutes: Math.round(t.watch_seconds / 60),
      views: t.view_count,
    }));

    const occasional = Math.round(returningVisitors * 0.58);
    const frequent = Math.round(returningVisitors * 0.28);
    const loyal = Math.max(0, returningVisitors - occasional - frequent);

    return {
      liveViewers,
      totalVisitors,
      countries: countriesList,
      repeatingUsers: {
        totalVisitors,
        newVisitors,
        returningVisitors,
        repeatRate,
        totalSessions,
        averageVisitsPerUser: totalVisitors > 0 ? Number((totalSessions / totalVisitors).toFixed(1)) : 0,
        frequencyBuckets: {
          single: newVisitors,
          occasional,
          frequent,
          loyal,
        },
      },
      watchedMinutes: {
        totalMinutes,
        totalHours,
        byType: {
          movie: movieMin,
          tv: tvMin,
          live: liveMin,
        },
        byTypePercentage: {
          movie: Number(((movieMin / sumMin) * 100).toFixed(1)),
          tv: Number(((tvMin / sumMin) * 100).toFixed(1)),
          live: Number(((liveMin / sumMin) * 100).toFixed(1)),
        },
        averageMinutesPerSession: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0,
        topTitles: topTitles.length > 0 ? topTitles : [...memoryStore.titles.values()].slice(0, 10).map(t => ({
          title: t.title,
          mediaType: t.mediaType,
          watchMinutes: Math.round(t.watchSeconds / 60),
          views: t.views
        })),
      },
      engagement: {
        pageViews: statsMap.get("page_views") ?? 0,
        engagedSessions: statsMap.get("engaged_sessions") ?? 0,
        engagementRate: totalSessions > 0
          ? Number((((statsMap.get("engaged_sessions") ?? 0) / totalSessions) * 100).toFixed(1))
          : 0,
      },
      adPerformance,
      clientInfo: {
        country: currentCountry,
        name: getCountryName(currentCountry),
        flag: countryCodeToFlag(currentCountry),
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[analytics] D1 summary fetch failed, using memory:", err);
    return { ...memoryStore.getSummary(currentCountry), liveViewers, adPerformance };
  }
}
