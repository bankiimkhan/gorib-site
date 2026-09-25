// Worker entry (wrangler.jsonc "main"). Wraps the OpenNext-generated worker so this
// project can export its own Durable Objects alongside it.
// `.open-next/worker.js` only exists after `opennextjs-cloudflare build`.
import handler from "./.open-next/worker.js";

// OpenNext's own Durable Objects, re-exported in case its caching features are enabled.
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

export { PresenceCounter } from "./src/worker/PresenceCounter.ts";

export default handler;
