import { StreamResult, StreamSource } from "@/types/streaming";
import {
  deduplicateSubtitleTracks,
  deduplicateAudioTracks,
  normalizeLanguageCode,
} from "@/lib/utils/languages";

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

  // Sanitize and deduplicate subtitles
  const rawSubtitles = Array.isArray(s.subtitles)
    ? s.subtitles
        .filter((sub) => sub && typeof sub === "object" && isValidStreamUrl(sub.url))
        .map((sub) => ({
          label: String(sub.label || "Subtitle"),
          language: normalizeLanguageCode(sub.language || "en"),
          url: sub.url!.trim(),
          default: Boolean(sub.default),
        }))
    : undefined;
  const subtitles = rawSubtitles && rawSubtitles.length > 0 ? deduplicateSubtitleTracks(rawSubtitles) : undefined;

  // Sanitize and deduplicate audio tracks
  const rawAudio = Array.isArray(s.audioTracks)
    ? s.audioTracks
        .filter((a) => a && typeof a === "object")
        .map((a, i) => ({
          id: a.id !== undefined && a.id !== null ? a.id : i,
          label: String(a.label || "Audio Track"),
          language: normalizeLanguageCode(a.language || "en"),
          default: Boolean(a.default),
          isDub: Boolean(a.isDub),
          channels: typeof a.channels === "number" ? a.channels : undefined,
          sourceIndex: typeof a.sourceIndex === "number" ? a.sourceIndex : undefined,
        }))
    : undefined;
  const audioTracks = rawAudio && rawAudio.length > 0 ? deduplicateAudioTracks(rawAudio) : undefined;

  return {
    url: s.url!.trim(),
    format,
    quality: s.quality || "auto",
    language: normalizeLanguageCode(s.language || "en"),
    audioTracks,
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

  const availableSubtitles = Array.isArray(res.availableSubtitles)
    ? deduplicateSubtitleTracks(res.availableSubtitles)
    : undefined;

  const availableAudio = Array.isArray(res.availableAudio)
    ? deduplicateAudioTracks(res.availableAudio)
    : undefined;

  return {
    mediaId: String(res.mediaId),
    type: res.type === "tv" ? "tv" : "movie",
    title: String(res.title),
    season: res.season,
    episode: res.episode,
    sources: validSources,
    defaultSourceIndex: defaultIndex,
    duration: typeof res.duration === "number" ? res.duration : undefined,
    availableSubtitles,
    availableAudio,
  };
}

