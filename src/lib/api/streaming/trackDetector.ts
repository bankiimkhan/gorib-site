import { SubtitleTrack, AudioTrack } from "@/types/streaming";
import { getTranslations, getMovieDetails, getTVDetails } from "@/lib/api/tmdb/client";
import {
  normalizeLanguageCode,
  formatSubtitleLabel,
  formatAudioLabel,
  deduplicateSubtitleTracks,
  deduplicateAudioTracks,
} from "@/lib/utils/languages";

export interface DetectedLanguagesResult {
  availableSubtitles: SubtitleTrack[];
  availableAudio: AudioTrack[];
  originalLanguage?: string;
}

/**
 * Detects genuinely available subtitle and audio tracks for a movie or TV episode
 * using real metadata from TMDB translations and spoken language details.
 */
export async function detectAvailableLanguages(params: {
  type: "movie" | "tv";
  tmdbId: number;
  season?: number;
  episode?: number;
  title?: string;
}): Promise<DetectedLanguagesResult> {
  const { type, tmdbId, season, episode } = params;

  // 1. Fetch translations and details concurrently
  const [translationsResult, mediaDetails] = await Promise.all([
    getTranslations(type, tmdbId, season, episode).catch(() => null),
    type === "movie"
      ? getMovieDetails(tmdbId).catch(() => null)
      : getTVDetails(tmdbId).catch(() => null),
  ]);

  const originalLanguage = normalizeLanguageCode(mediaDetails?.originalLanguage || "en");
  const spokenLanguages: string[] = (
    mediaDetails?.spokenLanguages && mediaDetails.spokenLanguages.length > 0
      ? mediaDetails.spokenLanguages
      : [originalLanguage]
  ).map((l) => normalizeLanguageCode(l));

  // 2. Build Subtitle Tracks
  const rawSubtitles: SubtitleTrack[] = [];

  if (translationsResult?.translations && translationsResult.translations.length > 0) {
    // Sort so English and Original language appear first
    const sortedTranslations = [...translationsResult.translations].sort((a, b) => {
      const codeA = normalizeLanguageCode(a.iso_639_1);
      const codeB = normalizeLanguageCode(b.iso_639_1);
      if (codeA === "en") return -1;
      if (codeB === "en") return 1;
      if (codeA === originalLanguage) return -1;
      if (codeB === originalLanguage) return 1;
      return (a.english_name || a.name).localeCompare(b.english_name || b.name);
    });

    for (const t of sortedTranslations) {
      const code = normalizeLanguageCode(t.iso_639_1);
      if (!code || code === "und") continue;

      const label = formatSubtitleLabel({
        label: t.english_name || t.name,
        language: code,
      });

      const epParams =
        season !== undefined && episode !== undefined
          ? `&season=${season}&episode=${episode}`
          : "";
      const subUrl = `/api/subtitles?tmdbId=${tmdbId}&type=${type}&lang=${code}${epParams}`;

      const isEnglish = code === "en";
      const hasEnglish = sortedTranslations.some(
        (x) => normalizeLanguageCode(x.iso_639_1) === "en"
      );

      rawSubtitles.push({
        label,
        language: code,
        url: subUrl,
        default: isEnglish || (!hasEnglish && code === originalLanguage),
      });
    }
  } else {
    // If no translations are returned from API, add standard subtitle if original is foreign
    if (originalLanguage !== "en" && originalLanguage !== "und") {
      const epParams =
        season !== undefined && episode !== undefined
          ? `&season=${season}&episode=${episode}`
          : "";
      rawSubtitles.push({
        label: "English",
        language: "en",
        url: `/api/subtitles?tmdbId=${tmdbId}&type=${type}&lang=en${epParams}`,
        default: true,
      });
    }
  }

  const availableSubtitles = deduplicateSubtitleTracks(rawSubtitles);

  // 3. Build Audio Tracks
  const rawAudio: AudioTrack[] = [];

  // Original audio track
  rawAudio.push({
    id: `audio-orig-${originalLanguage}`,
    label: formatAudioLabel({ language: originalLanguage, isOriginal: true }),
    language: originalLanguage,
    default: true,
  });

  // Additional spoken languages (e.g. for multilingual films/shows)
  for (const spoken of spokenLanguages) {
    if (spoken !== originalLanguage && spoken !== "und") {
      rawAudio.push({
        id: `audio-spoken-${spoken}`,
        label: formatAudioLabel({ language: spoken }),
        language: spoken,
      });
    }
  }

  const availableAudio = deduplicateAudioTracks(rawAudio);

  return {
    availableSubtitles,
    availableAudio,
    originalLanguage,
  };
}

