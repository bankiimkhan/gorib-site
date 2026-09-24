import { StreamSource } from "@/types/streaming";

/**
 * Stremio HTTP addon stream source
 * Queries addon manifests configured in STREMIO_ADDONS (comma-separated) using the
 * open Stremio addon protocol: GET {base}/stream/{movie|series}/{id}.json
 * See https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/stream.md
 */

interface StremioStream {
  url?: string;
  name?: string;
  title?: string;
  description?: string;
  infoHash?: string;
  externalUrl?: string;
  ytId?: string;
  behaviorHints?: {
    notWebReady?: boolean;
    proxyHeaders?: { request?: Record<string, string> };
  };
}

const REQUEST_TIMEOUT_MS = 6000;
const MAX_SOURCES_PER_ADDON = 4;

/** Accepts `stremio://`, bare hosts, or full manifest URLs and returns the addon base URL */
export function addonBaseUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return null;
  if (url.startsWith("stremio://")) url = `https://${url.slice("stremio://".length)}`;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/manifest\.json(\?.*)?$/i, "").replace(/\/+$/, "");
  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

export function getConfiguredAddons(): string[] {
  return (process.env.STREMIO_ADDONS || "")
    .split(",")
    .map(addonBaseUrl)
    .filter((u): u is string => Boolean(u));
}

function detectQuality(text: string): StreamSource["quality"] {
  if (/2160p|4k|1080p/i.test(text)) return "1080p";
  if (/720p/i.test(text)) return "720p";
  if (/480p/i.test(text)) return "480p";
  if (/360p/i.test(text)) return "360p";
  return "auto";
}

/**
 * Keeps only streams a browser can play directly: plain http(s) URLs that the addon
 * marks web-ready and that don't need custom request headers (browsers can't set them).
 */
export function toBrowserSources(streams: StremioStream[], addonLabel: string): StreamSource[] {
  const sources: StreamSource[] = [];
  for (const stream of streams) {
    if (!stream.url || !/^https?:\/\//i.test(stream.url)) continue;
    if (stream.behaviorHints?.notWebReady) continue;
    const proxyHeaders = stream.behaviorHints?.proxyHeaders?.request;
    if (proxyHeaders && Object.keys(proxyHeaders).length > 0) continue;

    const label = [stream.name, stream.title || stream.description].filter(Boolean).join(" ");
    const isHls = /\.m3u8(\?|$)/i.test(stream.url);
    sources.push({
      url: stream.url,
      format: isHls ? "hls" : "mp4",
      quality: detectQuality(label),
      serverName: `${addonLabel}${stream.name ? ` · ${stream.name.split("\n")[0]}` : ""}`,
    });
    if (sources.length >= MAX_SOURCES_PER_ADDON) break;
  }
  return sources;
}

async function fetchAddonStreams(base: string, type: "movie" | "series", id: string): Promise<StreamSource[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/stream/${type}/${encodeURIComponent(id)}.json`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { streams?: StremioStream[] };
    const host = new URL(base).hostname.replace(/^www\./, "");
    return toBrowserSources(Array.isArray(json.streams) ? json.streams : [], host);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Stremio addons key content by IMDb ID; series use `tt123:season:episode` */
export async function getStremioSources(params: {
  imdbId?: string;
  season?: number;
  episode?: number;
}): Promise<StreamSource[]> {
  const addons = getConfiguredAddons();
  if (!params.imdbId || addons.length === 0) return [];

  const isEpisode = params.season !== undefined && params.episode !== undefined;
  const type = isEpisode ? "series" : "movie";
  const id = isEpisode ? `${params.imdbId}:${params.season}:${params.episode}` : params.imdbId;

  const results = await Promise.all(addons.map((base) => fetchAddonStreams(base, type, id)));
  return results.flat();
}
