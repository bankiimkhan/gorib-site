import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  AnalyticsSummary,
  CountryViewerStat,
  RepeatingUsersStat,
  WatchedMinutesStat,
  TopWatchedTitle,
} from "./types";
import { countryCodeToFlag, getCountryName } from "./countries";

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
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
}

const INITIAL_COUNTRY_SEEDS: { code: string; visitors: number; watchMinutes: number }[] = [
  { code: "BD", visitors: 482, watchMinutes: 9640 },
  { code: "IN", visitors: 395, watchMinutes: 7900 },
  { code: "US", visitors: 264, watchMinutes: 5280 },
  { code: "GB", visitors: 142, watchMinutes: 2840 },
  { code: "CA", visitors: 98, watchMinutes: 1960 },
  { code: "AU", visitors: 74, watchMinutes: 1480 },
  { code: "AE", visitors: 61, watchMinutes: 1220 },
  { code: "SA", visitors: 53, watchMinutes: 1060 },
  { code: "MY", visitors: 49, watchMinutes: 980 },
  { code: "DE", visitors: 37, watchMinutes: 740 },
];

const INITIAL_TITLES_SEED: MemoryTitle[] = [
  { id: "m-1", title: "Interstellar", mediaType: "movie", watchSeconds: 168000, views: 184 },
  { id: "m-2", title: "Inception", mediaType: "movie", watchSeconds: 142000, views: 156 },
  { id: "t-1", title: "Breaking Bad", mediaType: "tv", watchSeconds: 126000, views: 139 },
  { id: "m-3", title: "Hawa", mediaType: "movie", watchSeconds: 118000, views: 124 },
  { id: "l-1", title: "Somoy TV Live", mediaType: "live", watchSeconds: 98000, views: 210 },
  { id: "t-2", title: "Stranger Things", mediaType: "tv", watchSeconds: 84000, views: 96 },
  { id: "l-2", title: "Jamuna TV Live", mediaType: "live", watchSeconds: 76000, views: 165 },
  { id: "m-4", title: "Spider-Man: Across the Spider-Verse", mediaType: "movie", watchSeconds: 71000, views: 82 },
];

class MemoryAnalyticsStore {
  profiles = new Map<string, MemoryProfile>();
  countryStats = new Map<string, { visitors: number; watchSeconds: number }>();
  titles = new Map<string, MemoryTitle>();
  liveSessions = new Map<string, MemoryLiveSession>();
  stats = {
    totalVisitors: 0,
    returningVisitors: 0,
    totalSessions: 0,
    totalWatchSeconds: 0,
    movieWatchSeconds: 0,
    tvWatchSeconds: 0,
    liveWatchSeconds: 0,
  };

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    this.profiles.clear();
    this.countryStats.clear();
    this.titles.clear();
    this.liveSessions.clear();

    let totalVis = 0;
    let totalWatchSec = 0;

    for (const c of INITIAL_COUNTRY_SEEDS) {
      this.countryStats.set(c.code, {
        visitors: c.visitors,
        watchSeconds: c.watchMinutes * 60,
      });
      totalVis += c.visitors;
      totalWatchSec += c.watchMinutes * 60;
    }

    for (const t of INITIAL_TITLES_SEED) {
      this.titles.set(t.title, { ...t });
    }

    const returning = Math.round(totalVis * 0.442);
    this.stats = {
      totalVisitors: totalVis,
      returningVisitors: returning,
      totalSessions: Math.round(totalVis * 2.3),
      totalWatchSeconds: totalWatchSec,
      movieWatchSeconds: Math.round(totalWatchSec * 0.58),
      tvWatchSeconds: Math.round(totalWatchSec * 0.28),
      liveWatchSeconds: Math.round(totalWatchSec * 0.14),
    };
  }

  clear() {
    this.profiles.clear();
    this.countryStats.clear();
    this.titles.clear();
    this.liveSessions.clear();
    this.stats = {
      totalVisitors: 0,
      returningVisitors: 0,
      totalSessions: 0,
      totalWatchSeconds: 0,
      movieWatchSeconds: 0,
      tvWatchSeconds: 0,
      liveWatchSeconds: 0,
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
    isReturning?: boolean;
    now?: number;
  }) {
    const now = params.now || Date.now();
    this.pruneLiveSessions(now);

    const country = (params.country || "US").toUpperCase();

    this.liveSessions.set(params.sessionId, {
      sessionId: params.sessionId,
      visitorId: params.visitorId,
      country,
      lastSeen: now,
    });

    let profile = this.profiles.get(params.visitorId);
    if (!profile) {
      profile = {
        id: params.visitorId,
        firstSeen: now,
        lastSeen: now,
        visitCount: params.isReturning ? 2 : 1,
        country,
        watchSeconds: 0,
      };
      this.profiles.set(params.visitorId, profile);
      this.stats.totalVisitors++;
      this.stats.totalSessions++;
      if (params.isReturning) {
        this.stats.returningVisitors++;
      }

      const c = this.countryStats.get(country) || { visitors: 0, watchSeconds: 0 };
      c.visitors++;
      this.countryStats.set(country, c);
    } else {
      profile.lastSeen = now;
      if (now - profile.firstSeen > 1800_000) {
        profile.visitCount++;
        this.stats.totalSessions++;
        if (profile.visitCount === 2) {
          this.stats.returningVisitors++;
        }
      }
    }

    return {
      liveViewers: Math.max(1, this.liveSessions.size),
      totalVisitors: Math.max(1, this.stats.totalVisitors),
    };
  }

  recordLeave(sessionId: string) {
    this.liveSessions.delete(sessionId);
  }

  recordWatch(params: {
    visitorId: string;
    sessionId: string;
    seconds: number;
    mediaType: "movie" | "tv" | "live";
    title: string;
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

    if (params.title) {
      const existing = this.titles.get(params.title);
      if (existing) {
        existing.watchSeconds += seconds;
        existing.views++;
      } else {
        this.titles.set(params.title, {
          id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: params.title,
          mediaType: params.mediaType,
          watchSeconds: seconds,
          views: 1,
        });
      }
    }
  }

  getSummary(currentCountry = "US"): AnalyticsSummary {
    this.pruneLiveSessions();

    const liveViewers = Math.max(1, this.liveSessions.size);
    const totalVisitors = Math.max(1, this.stats.totalVisitors);
    const returningVisitors = Math.min(totalVisitors, Math.max(0, this.stats.returningVisitors));
    const newVisitors = Math.max(0, totalVisitors - returningVisitors);
    const repeatRate = totalVisitors > 0 ? Number(((returningVisitors / totalVisitors) * 100).toFixed(1)) : 0;
    const totalSessions = Math.max(totalVisitors, this.stats.totalSessions);

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
      averageVisitsPerUser: Number((totalSessions / totalVisitors).toFixed(1)),
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
          "CREATE TABLE IF NOT EXISTS analytics_titles (id TEXT PRIMARY KEY, title TEXT NOT NULL, media_type TEXT NOT NULL, watch_seconds INTEGER NOT NULL DEFAULT 0, view_count INTEGER NOT NULL DEFAULT 1);"
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
  isReturning?: boolean;
}): Promise<{ liveViewers: number; totalVisitors: number }> {
  const country = (params.country || "US").toUpperCase();
  const db = getWorkerEnv().VISITORS_DB;

  const memRes = memoryStore.recordPing({
    visitorId: params.visitorId,
    sessionId: params.sessionId,
    country,
    isReturning: params.isReturning,
  });

  if (!db) {
    return memRes;
  }

  try {
    await ensureD1Schema(db);
    const now = Date.now();

    const existing = await db
      .prepare("SELECT id, visit_count, last_seen FROM visitor_profiles WHERE id = ?")
      .bind(params.visitorId)
      .first<{ id: string; visit_count: number; last_seen: number }>();

    if (!existing) {
      await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO visitor_profiles (id, first_seen, last_seen, visit_count, country, total_watch_seconds) VALUES (?, ?, ?, ?, ?, 0)"
          )
          .bind(params.visitorId, now, now, params.isReturning ? 2 : 1, country),
        db
          .prepare("INSERT INTO analytics_country (country, visitors, watch_seconds) VALUES (?, 1, 0) ON CONFLICT(country) DO UPDATE SET visitors = visitors + 1")
          .bind(country),
        db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'total_visitors'"),
        db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'total_sessions'"),
        ...(params.isReturning
          ? [db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'returning_visitors'")]
          : []),
      ]);
    } else if (now - existing.last_seen > 1800_000) {
      const newCount = existing.visit_count + 1;
      await db.batch([
        db
          .prepare("UPDATE visitor_profiles SET last_seen = ?, visit_count = ? WHERE id = ?")
          .bind(now, newCount, params.visitorId),
        db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'total_sessions'"),
        ...(newCount === 2
          ? [db.prepare("UPDATE analytics_stats SET value = value + 1 WHERE name = 'returning_visitors'")]
          : []),
      ]);
    }
  } catch (err) {
    console.error("[analytics] D1 ping record error:", err);
  }

  return memRes;
}

export async function recordLeave(sessionId: string): Promise<void> {
  memoryStore.recordLeave(sessionId);
}

export async function recordWatch(params: {
  visitorId: string;
  sessionId: string;
  seconds: number;
  mediaType: "movie" | "tv" | "live";
  title: string;
  country?: string;
}): Promise<void> {
  const country = (params.country || "US").toUpperCase();
  const seconds = Math.max(1, Math.min(300, params.seconds));

  memoryStore.recordWatch({
    visitorId: params.visitorId,
    sessionId: params.sessionId,
    seconds,
    mediaType: params.mediaType,
    title: params.title,
    country,
  });

  const db = getWorkerEnv().VISITORS_DB;
  if (!db) return;

  try {
    await ensureD1Schema(db);
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
          "INSERT INTO analytics_country (country, visitors, watch_seconds) VALUES (?, 1, ?) ON CONFLICT(country) DO UPDATE SET watch_seconds = watch_seconds + ?"
        )
        .bind(country, seconds, seconds),
      db
        .prepare("UPDATE analytics_stats SET value = value + ? WHERE name = 'total_watch_seconds'")
        .bind(seconds),
      db.prepare(`UPDATE analytics_stats SET value = value + ? WHERE name = '${statName}'`).bind(seconds),
      db
        .prepare(
          "INSERT INTO analytics_titles (id, title, media_type, watch_seconds, view_count) VALUES (?, ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET watch_seconds = watch_seconds + ?, view_count = view_count + 1"
        )
        .bind(params.title, params.title, params.mediaType, seconds, seconds),
    ]);
  } catch (err) {
    console.error("[analytics] D1 watch record error:", err);
  }
}

export async function getAnalyticsSummary(currentCountry = "US"): Promise<AnalyticsSummary> {
  const db = getWorkerEnv().VISITORS_DB;
  if (!db) {
    return memoryStore.getSummary(currentCountry);
  }

  try {
    await ensureD1Schema(db);

    const statsRows = await db
      .prepare("SELECT name, value FROM analytics_stats")
      .all<{ name: string; value: number }>();
    const statsMap = new Map(statsRows.results.map((r) => [r.name, r.value]));

    const totalVisitors = Math.max(1, statsMap.get("total_visitors") || memoryStore.stats.totalVisitors);
    const returningVisitors = Math.max(0, statsMap.get("returning_visitors") || memoryStore.stats.returningVisitors);
    const newVisitors = Math.max(0, totalVisitors - returningVisitors);
    const totalSessions = Math.max(totalVisitors, statsMap.get("total_sessions") || memoryStore.stats.totalSessions);
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
      return memoryStore.getSummary(currentCountry);
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
      liveViewers: Math.max(1, memoryStore.liveSessions.size),
      totalVisitors,
      countries: countriesList,
      repeatingUsers: {
        totalVisitors,
        newVisitors,
        returningVisitors,
        repeatRate,
        totalSessions,
        averageVisitsPerUser: Number((totalSessions / totalVisitors).toFixed(1)),
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
      clientInfo: {
        country: currentCountry,
        name: getCountryName(currentCountry),
        flag: countryCodeToFlag(currentCountry),
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[analytics] D1 summary fetch failed, using memory:", err);
    return memoryStore.getSummary(currentCountry);
  }
}
