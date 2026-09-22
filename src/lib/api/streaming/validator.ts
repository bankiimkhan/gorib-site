import { StreamResult, StreamSource } from "@/types/streaming";

/**
 * Validates a single stream source URL and ensures it meets security criteria
 */
export function isValidStreamUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    // Allow https and http (for local testing), reject javascript:, data:, file:
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Cleans and validates a StreamSource object
 */
export function validateStreamSource(source: unknown): StreamSource | null {
  if (!source || typeof source !== "object") return null;

  const s = source as Partial<StreamSource>;
  if (!isValidStreamUrl(s.url)) return null;

  const validFormats = ["hls", "mp4", "webm", "iframe"];
  let format = s.format;
  if (!format || !validFormats.includes(format)) {
    if (s.url!.includes(".m3u8")) {
      format = "hls";
    } else if (s.url!.includes(".webm")) {
      format = "webm";
    } else if (s.url!.includes(".mp4")) {
      format = "mp4";
    } else {
      format = "iframe";
    }
  }

  // Sanitize subtitles
  const subtitles = Array.isArray(s.subtitles)
    ? s.subtitles
        .filter((sub) => sub && typeof sub === "object" && isValidStreamUrl(sub.url))
        .map((sub) => ({
          label: String(sub.label || "Subtitle"),
          language: String(sub.language || "en"),
          url: sub.url,
          default: Boolean(sub.default),
        }))
    : undefined;

  return {
    url: s.url!.trim(),
    format,
    quality: s.quality || "auto",
    language: s.language || "en",
    subtitles,
    serverName: s.serverName ? String(s.serverName) : undefined,
  };
}

/**
 * Validates an entire StreamResult object, ensuring at least one playable source exists
 */
export function validateStreamResult(data: unknown): StreamResult | null {
  if (!data || typeof data !== "object") return null;

  const res = data as Partial<StreamResult>;
  if (!res.mediaId || !res.title) return null;

  if (!Array.isArray(res.sources) || res.sources.length === 0) {
    return null;
  }

  const validSources: StreamSource[] = [];
  for (const src of res.sources) {
    const valid = validateStreamSource(src);
    if (valid) {
      validSources.push(valid);
    }
  }

  if (validSources.length === 0) {
    return null;
  }

  const defaultIndex =
    typeof res.defaultSourceIndex === "number" &&
    res.defaultSourceIndex >= 0 &&
    res.defaultSourceIndex < validSources.length
      ? res.defaultSourceIndex
      : 0;

  return {
    mediaId: String(res.mediaId),
    type: res.type === "tv" ? "tv" : "movie",
    title: String(res.title),
    season: res.season,
    episode: res.episode,
    sources: validSources,
    defaultSourceIndex: defaultIndex,
    duration: typeof res.duration === "number" ? res.duration : undefined,
  };
}

