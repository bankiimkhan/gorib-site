-- Safe, additive rollout for analytics integrity. Existing aggregate data is
-- retained; new tables start collecting correctly-deduplicated sessions,
-- route categories, playback events, and ad delivery diagnostics.

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  country TEXT NOT NULL,
  page_views INTEGER NOT NULL DEFAULT 0,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  engaged INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS analytics_sessions_visitor_idx ON analytics_sessions(visitor_id);

CREATE TABLE IF NOT EXISTS analytics_page_views (
  session_id TEXT NOT NULL,
  page_type TEXT NOT NULL,
  PRIMARY KEY (session_id, page_type)
);

CREATE TABLE IF NOT EXISTS analytics_watch_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  recorded_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_event_metrics (
  occurred_on TEXT NOT NULL,
  placement TEXT NOT NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (occurred_on, placement, provider, event_type)
);

INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('page_views', 0);
INSERT OR IGNORE INTO analytics_stats (name, value) VALUES ('engaged_sessions', 0);
