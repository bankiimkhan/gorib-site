# Analytics and advertising audit

Date: 2026-10-10

## Scope and original data flow

The application had a first-party analytics implementation:

- `AnalyticsTracker` generated a persistent browser `visitorId`, tab-scoped `sessionId`, and 15-second heartbeats.
- `POST /api/analytics` updated D1 visitor profiles, country totals, watch time, and title views; the private `/analytics` page read those aggregates.
- `VideoPlayer` emitted a playback start and then credited a fixed 15 seconds on a timer while its React `isPlaying` state was true.
- The ad system already had useful client-side protections: placement flags, lazy loading, per-route/per-session request budgets, empty-slot collapse, viewability timing, and player-route safeguards. Its events were only browser custom events/data-layer pushes, however, so the dashboard could not measure ad delivery.
- `/api/viewers` had a Durable Object designed for global presence, but normal heartbeats never reached it—only leave events did. The analytics dashboard instead reported process-local memory for “live viewers.”

## Original assessment

Scores are evidence-based for the code before this change; they do not claim to measure real traffic quality.

| Dimension | Score | Verified finding |
| --- | ---: | --- |
| Tracking integrity | 3/10 | Development fallback seeded fabricated countries, titles, and totals; empty states were forced to one visitor/viewer. |
| Session/visitor identification | 5/10 | Persistent visitor and tab session IDs were reasonable primitives, but the server trusted the browser's `isReturning` flag and treated a 30-minute gap as a new session. |
| Metric definitions | 3/10 | No page views or engagement definition; watch time was timer-based; frequency buckets were inferred rather than observed. |
| Live audience | 2/10 | The global Durable Object existed but was not heartbeated; dashboard live counts were isolate-local and minimum-one fabricated. |
| Ad placement/UX | 6/10 | Lazy loading, request budgets, no-CLS reservations, dismissal, and player safety were sound. Some custom tags still require independent review. |
| Revenue attribution | 1/10 | No persisted ad delivery data or provider revenue import existed, so fill, viewability, eCPM, and revenue per session could not be reconciled. |
| Performance/scalability | 5/10 | Frequent D1 writes and an unbounded raw title/session table risked avoidable load; ad telemetry was cheap but discarded. |
| Privacy/security | 3/10 | Identifiers were persistent local-storage values without a consent gate; the ingest endpoint accepted broad client claims and arbitrary default actions. |
| Maintainability/reporting | 5/10 | The implementation was readable and centralized, but schema creation was implicit, dashboard claims exceeded evidence, and important data paths were disconnected. |

## Implemented architecture and decisions

### Critical fixes

- Removed fabricated analytics seeds and all `Math.max(1, …)` dashboard/count behavior. Empty means zero.
- Connected the 15-second active-tab presence heartbeat to the global Durable Object. Analytics persistence now occurs at startup, navigation/playback, and once a minute, reducing unnecessary D1 writes while keeping presence responsive.
- Made sessions server-derived from a distinct browser tab session ID. A returning visitor is identified only when a later session is recorded; the client flag is ignored.
- Added strict action, identifier, title, duration, page-type, and event-id validation to `/api/analytics`. Unsupported events now receive `400` rather than silently becoming a ping.
- Added D1-backed idempotency for playback watch events and retained the existing start-per-title/session protection.
- Replaced timer-based watch credit with measured `<video>` time progression. Pauses, buffering, hidden tabs, forward seeks, and source jumps do not add watch time.

### High-impact measurement

- Added privacy-minimised page categories (`home`, `catalog`, `details`, `player`, `search`, `live`, `other`), never raw URLs, query strings, titles, or searches. A category counts once per session, preventing Strict Mode and navigation duplicates.
- Added safe, additive `analytics_sessions`, `analytics_page_views`, and `analytics_watch_events` tables. Engagement is a session with two route categories or 30 seconds of measured playback.
- Added `page_views` and `engaged_sessions` aggregate metrics to the private dashboard.
- Persisted operational ad aggregates by day, placement, provider, and event type. The dashboard now shows request count, fill rate, viewability rate, and blocked count. It intentionally does **not** invent revenue.

### Privacy and advertising

- Analytics and third-party ad tags now run automatically without account, login, contact, or form data collection; browser Do Not Track remains respected. The random local browser identifier is pseudonymous (used only for deduplication), not a direct identity. Set `NEXT_PUBLIC_PRIVACY_REQUIRE_CONSENT=true` only if a jurisdiction or ad partner requires an opt-in workflow.
- Ad event ingestion contains no visitor identifier, page URL, media title, click target, or revenue claim. It only records aggregate delivery signals.
- Existing conservative controls are retained: player-route restrictions, display-only approval requirement, lazy request budgets, compact-screen player suppression, sticky opt-in/dismissal, and CLS-safe containers.

## Migration and rollout

`migrations/0002_analytics_integrity.sql` is additive and preserves existing D1 data. Runtime `CREATE TABLE IF NOT EXISTS` bootstrap remains for compatibility with prior deployments, but the migration should be applied through the normal D1 deployment process before relying on the new dashboard fields.

Historical aggregates cannot be made accurate retroactively: they include prior client-declared returning status, timer-based watch time, and any seed-era local data. The new session/page/ad metrics are reliable from rollout onward and should be labelled as such in business reporting.

## Validation performed

- `pnpm test` — 27 files, 155 tests passed.
- `pnpm lint` — passed.
- `pnpm exec tsc --noEmit` — passed.
- Added coverage for truthful zero presence, server-derived returning sessions, deduplicated page categories, and malformed event rejection.
- A `next build` was attempted but could not start because an unrelated existing `.next/lock` / Turbopack worker was already active. No running process was interrupted.

## Revenue strategy and remaining work

The right optimization target is qualified, viewable demand per engaged session—not more slots. Keep the current one-request-per-route, four-per-session conservative default; compare placements only after enough opted-in traffic exists. Import an authorized ad-network report before calculating revenue, eCPM, fill rate by geography, or revenue per session. Then run controlled experiments on placement type/device/content length and evaluate viewability, engagement, player completion, and complaints together.

Before a production rollout, configure edge/WAF rate limits for the two public telemetry endpoints, set a retention/deletion policy for pseudonymous identifiers, and replace the simple banner with a certified CMP if the advertising partner or jurisdiction requires IAB TCF/region-specific consent handling. Provider-side invalid-traffic, bot, revenue, and policy decisions cannot be validated from this codebase alone.
