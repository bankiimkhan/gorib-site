import { SubtitleTrack, AudioTrack } from "@/types/streaming";

/**
 * Standard ISO 639-1 / 639-2 to Human Readable Language Names Dictionary
 */
const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  eng: "English",
  bn: "Bengali",
  ben: "Bengali",
  hi: "Hindi",
  hin: "Hindi",
  es: "Spanish",
  spa: "Spanish",
  fr: "French",
  fra: "French",
  fre: "French",
  de: "German",
  deu: "German",
  ger: "German",
  it: "Italian",
  ita: "Italian",
  pt: "Portuguese",
  por: "Portuguese",
  ru: "Russian",
  rus: "Russian",
  ja: "Japanese",
  jpn: "Japanese",
  ko: "Korean",
  kor: "Korean",
  zh: "Chinese",
  zho: "Chinese",
  chi: "Chinese",
  ar: "Arabic",
  ara: "Arabic",
  tr: "Turkish",
  tur: "Turkish",
  te: "Telugu",
  tel: "Telugu",
  ta: "Tamil",
  tam: "Tamil",
  ml: "Malayalam",
  mal: "Malayalam",
  kn: "Kannada",
  kan: "Kannada",
  ur: "Urdu",
  urd: "Urdu",
  pa: "Punjabi",
  pan: "Punjabi",
  id: "Indonesian",
  ind: "Indonesian",
  th: "Thai",
  tha: "Thai",
  vi: "Vietnamese",
  vie: "Vietnamese",
  nl: "Dutch",
  nld: "Dutch",
  dut: "Dutch",
  pl: "Polish",
  pol: "Polish",
  sv: "Swedish",
  swe: "Swedish",
  no: "Norwegian",
  nor: "Norwegian",
  da: "Danish",
  dan: "Danish",
  fi: "Finnish",
  fin: "Finnish",
  el: "Greek",
  ell: "Greek",
  he: "Hebrew",
  heb: "Hebrew",
  cs: "Czech",
  ces: "Czech",
  hu: "Hungarian",
  hun: "Hungarian",
  ro: "Romanian",
  ron: "Romanian",
  uk: "Ukrainian",
  ukr: "Ukrainian",
  fa: "Persian",
  fas: "Persian",
  per: "Persian",
};

/**
 * Maps 3-letter codes to standard 2-letter ISO 639-1 codes
 */
const ISO3_TO_ISO2: Record<string, string> = {
  eng: "en",
  ben: "bn",
  hin: "hi",
  spa: "es",
  fra: "fr",
  fre: "fr",
  deu: "de",
  ger: "de",
  ita: "it",
  por: "pt",
  rus: "ru",
  jpn: "ja",
  kor: "ko",
  zho: "zh",
  chi: "zh",
  ara: "ar",
  tur: "tr",
  tel: "te",
  tam: "ta",
  mal: "ml",
  kan: "kn",
  urd: "ur",
  pan: "pa",
  ind: "id",
  tha: "th",
  vie: "vi",
  nld: "nl",
  dut: "nl",
  pol: "pl",
  swe: "sv",
  nor: "no",
  dan: "da",
  fin: "fi",
  ell: "el",
  heb: "he",
  ces: "cs",
  hun: "hu",
  ron: "ro",
  ukr: "uk",
  fas: "fa",
  per: "fa",
};

/**
 * Normalizes a raw language code string to canonical lowercase ISO code
 * e.g. "en-US" -> "en", "eng" -> "en", "  HI " -> "hi"
 */
export function normalizeLanguageCode(rawCode?: string | null): string {
  if (!rawCode || typeof rawCode !== "string") return "und";
  const cleaned = rawCode.trim().toLowerCase().split(/[-_]/)[0];
  if (!cleaned) return "und";
  return ISO3_TO_ISO2[cleaned] || cleaned;
}

/**
 * Returns human-readable display name for a language code
 * e.g. "en" -> "English", "bn" -> "Bengali", "hi" -> "Hindi"
 */
export function getLanguageDisplayName(code?: string | null, fallback?: string): string {
  if (!code || typeof code !== "string") {
    return fallback || "Unknown";
  }
  const normalized = normalizeLanguageCode(code);
  if (LANGUAGE_MAP[normalized]) {
    return LANGUAGE_MAP[normalized];
  }
  const cleanOriginal = code.trim().toLowerCase();
  if (LANGUAGE_MAP[cleanOriginal]) {
    return LANGUAGE_MAP[cleanOriginal];
  }
  return fallback || (normalized !== "und" ? normalized.toUpperCase() : "Unknown");
}

/**
 * Formats a clean, user-friendly subtitle track label
 */
export function formatSubtitleLabel(track: { label?: string; language?: string }): string {
  const langName = getLanguageDisplayName(track.language);
  const rawLabel = (track.label || "").trim();

  // If label is missing or generic, use language display name
  const isGeneric =
    !rawLabel ||
    /^subtitle(s)?$/i.test(rawLabel) ||
    /^track\s*\d+$/i.test(rawLabel) ||
    rawLabel.toLowerCase() === "und" ||
    rawLabel.toLowerCase() === track.language?.toLowerCase();

  if (isGeneric) {
    return langName;
  }

  // If label doesn't include the language name, prepend or format nicely
  if (!rawLabel.toLowerCase().includes(langName.toLowerCase())) {
    return `${langName} (${rawLabel})`;
  }

  return rawLabel;
}

/**
 * Formats a clean, user-friendly audio track label
 */
export function formatAudioLabel(track: {
  label?: string;
  language?: string;
  isDub?: boolean;
  isOriginal?: boolean;
}): string {
  const langName = getLanguageDisplayName(track.language);
  const rawLabel = (track.label || "").trim();

  if (track.isOriginal) {
    return `${langName} [Original]`;
  }
  if (track.isDub) {
    return `${langName} [Dubbed]`;
  }

  const isGeneric =
    !rawLabel ||
    /^audio(\s*\d+)?$/i.test(rawLabel) ||
    rawLabel.toLowerCase() === "und" ||
    rawLabel.toLowerCase() === track.language?.toLowerCase();

  if (isGeneric) {
    return langName;
  }

  return rawLabel;
}

/**
 * Deduplicates, validates, and normalizes a list of SubtitleTracks
 */
export function deduplicateSubtitleTracks(tracks?: SubtitleTrack[] | null): SubtitleTrack[] {
  if (!tracks || !Array.isArray(tracks)) return [];

  const seenUrls = new Set<string>();
  const seenLangLabels = new Set<string>();
  const result: SubtitleTrack[] = [];
  let hasDefault = false;

  for (const track of tracks) {
    if (!track || typeof track !== "object") continue;
    const url = (track.url || "").trim();
    if (!url) continue;

    // Normalization
    const language = normalizeLanguageCode(track.language);
    const label = formatSubtitleLabel({ label: track.label, language });

    const langKey = `${language}::${label.toLowerCase()}`;

    // Skip duplicate URLs or duplicate language+label pairs
    if (seenUrls.has(url) || seenLangLabels.has(langKey)) {
      continue;
    }

    seenUrls.add(url);
    seenLangLabels.add(langKey);

    const isDefault = Boolean(track.default) && !hasDefault;
    if (isDefault) {
      hasDefault = true;
    }

    result.push({
      label,
      language,
      url,
      default: isDefault ? true : undefined,
    });
  }

  return result;
}

/**
 * Deduplicates, validates, and normalizes a list of AudioTracks
 */
export function deduplicateAudioTracks(tracks?: AudioTrack[] | null): AudioTrack[] {
  if (!tracks || !Array.isArray(tracks)) return [];

  const seenKeys = new Set<string>();
  const result: AudioTrack[] = [];
  let hasDefault = false;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (!track || typeof track !== "object") continue;

    const language = normalizeLanguageCode(track.language);
    const label = formatAudioLabel({
      label: track.label,
      language,
      isDub: track.isDub,
    });

    const key = `${language}::${label.toLowerCase()}`;
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);

    const isDefault = Boolean(track.default) && !hasDefault;
    if (isDefault) {
      hasDefault = true;
    }

    result.push({
      id: track.id !== undefined && track.id !== null ? track.id : i,
      label,
      language,
      default: isDefault ? true : undefined,
      isDub: track.isDub,
      channels: track.channels,
      sourceIndex: track.sourceIndex,
    });
  }

  return result;
}

