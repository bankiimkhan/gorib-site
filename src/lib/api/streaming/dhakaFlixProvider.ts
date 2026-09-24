import { StreamSource, SubtitleTrack, AudioTrack } from "@/types/streaming";
import { formatSubtitleLabel, formatAudioLabel } from "@/lib/utils/languages";

const HOST_14 = process.env.DHAKA_FLIX_HOST_14 || process.env.DHAKA_FLIX_MOVIE_HOST || "http://172.16.50.14";
const HOST_7 = process.env.DHAKA_FLIX_HOST_7 || "http://172.16.50.7";
const HOST_12 = process.env.DHAKA_FLIX_HOST_12 || process.env.DHAKA_FLIX_TV_HOST || "http://172.16.50.12";
const HOST_9 = process.env.DHAKA_FLIX_HOST_9 || "http://172.16.50.9";

interface DirectoryItem {
  href: string;
  name: string;
}

// In-memory directory cache with 15-minute TTL
const directoryCache = new Map<string, { items: DirectoryItem[]; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Normalizes title for loose folder matching (removes punctuation, accents, lowercase)
 */
export function cleanTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[._\-:;,'`~!?&()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes Roman numerals and number words (e.g. Part II -> Part 2, Part Two -> Part 2)
 */
function normalizeRomanNumerals(str: string): string {
  return str
    .replace(/\bpart\s+ii\b/g, "part 2")
    .replace(/\bpart\s+iii\b/g, "part 3")
    .replace(/\bpart\s+iv\b/g, "part 4")
    .replace(/\bpart\s+v\b/g, "part 5")
    .replace(/\bpart\s+two\b/g, "part 2")
    .replace(/\bpart\s+three\b/g, "part 3")
    .replace(/\bpart\s+four\b/g, "part 4")
    .replace(/\bpart\s+five\b/g, "part 5")
    .replace(/\bpart\s+one\b/g, "part 1")
    .replace(/\bii\b/g, "2")
    .replace(/\biii\b/g, "3")
    .replace(/\biv\b/g, "4")
    .replace(/\bv\b/g, "5");
}

/**
 * Resolves a full URL whether href is absolute, root-relative (/path), or directory-relative
 */
function resolveUrl(href: string, baseDirUrl: string, host: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  if (href.startsWith("/")) {
    const cleanHost = host.replace(/\/+$/, "");
    return `${cleanHost}${href}`;
  }
  const cleanBase = baseDirUrl.endsWith("/") ? baseDirUrl : `${baseDirUrl}/`;
  return `${cleanBase}${href}`;
}

/**
 * Extracts links from an h5ai / Nginx HTML directory listing
 */
export function extractDirectoryLinks(html: string): DirectoryItem[] {
  const regex = /<a href="([^"]+)">([^<]+)<\/a>/g;
  const links: DirectoryItem[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const name = match[2].trim();
    if (href !== ".." && !href.startsWith("http://browsehappy.com") && name !== "Parent Directory") {
      links.push({ href, name });
    }
  }

  return links;
}

/**
 * Fetches an HTML directory page with timeout and in-memory cache
 */
async function fetchDirectory(url: string, timeoutMs = 1800): Promise<DirectoryItem[] | null> {
  const cached = directoryCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.items;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "gorib.lol-media-resolver/1.0" },
    });

    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const items = extractDirectoryLinks(html);
    directoryCache.set(url, { items, timestamp: Date.now() });
    return items;
  } catch {
    return null;
  }
}

/**
 * Extracts subtitle tracks from directory file links
 */
function extractSubtitlesFromDirectory(
  fileLinks: DirectoryItem[],
  baseUrl: string,
  host: string
): SubtitleTrack[] {
  const subtitleFiles = fileLinks.filter((f) => /\.(srt|vtt)$/i.test(f.href));
  const tracks: SubtitleTrack[] = [];

  for (const sub of subtitleFiles) {
    const fullUrl = resolveUrl(sub.href, baseUrl, host);
    const nameLower = sub.name.toLowerCase();
    let lang = "en";
    if (nameLower.includes("bangla") || nameLower.includes("bengali") || nameLower.includes(".bn.")) {
      lang = "bn";
    } else if (nameLower.includes("hindi") || nameLower.includes(".hi.")) {
      lang = "hi";
    } else if (nameLower.includes("spanish") || nameLower.includes(".es.")) {
      lang = "es";
    } else if (nameLower.includes("korean") || nameLower.includes(".ko.")) {
      lang = "ko";
    }

    tracks.push({
      label: formatSubtitleLabel({ label: sub.name.replace(/\.(srt|vtt)$/i, ""), language: lang }),
      language: lang,
      url: fullUrl,
      default: lang === "en",
    });
  }

  return tracks;
}

/**
 * Detects audio language from file or folder naming conventions
 */
function detectAudioLanguageFromContext(text: string): { language: string; isDub?: boolean } {
  const lower = text.toLowerCase();
  if (lower.includes("dual audio") || (lower.includes("hindi") && lower.includes("english"))) {
    return { language: "hi", isDub: true };
  }
  if (lower.includes("hindi") || lower.includes("bollywood")) {
    return { language: "hi", isDub: lower.includes("dub") };
  }
  if (lower.includes("bangla") || lower.includes("bengali") || lower.includes("kolkata")) {
    return { language: "bn", isDub: lower.includes("dub") };
  }
  if (lower.includes("tamil") || lower.includes("telugu") || lower.includes("malayalam") || lower.includes("kannada") || lower.includes("south")) {
    return { language: "ta", isDub: lower.includes("dub") };
  }
  if (lower.includes("korean") || lower.includes("kor")) {
    return { language: "ko", isDub: lower.includes("dub") };
  }
  if (lower.includes("japanese") || lower.includes("jpn")) {
    return { language: "ja", isDub: lower.includes("dub") };
  }
  return { language: "en", isDub: false };
}

/**
 * Calculates a match score between a candidate folder name and a search title
 */
export function scoreFolderMatch(folderName: string, title: string, year?: number): number {
  const cleanedQuery = normalizeRomanNumerals(cleanTitle(title));
  if (!cleanedQuery) return 0;

  // Clean folder name: strip leading numbers/dots e.g. "001. " or "01. "
  const strippedFolderName = folderName.replace(/^\d+[\.\s\-]+/, "");
  const cleanedFolder = normalizeRomanNumerals(cleanTitle(strippedFolderName));

  // Extract base title before quality/year tags
  const baseFolder = cleanedFolder
    .replace(/\b(19\d\d|20\d\d)\b/g, "")
    .replace(
      /\b(1080p|720p|2160p|4k|3d|dual audio|multi audio|hindi dubbed|subbed|webrip|bluray|brrip|hdrip|hdts|nf|hevc|x264|x265|dvdrip|esub|dd5 1)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  let score = 0;
  if (baseFolder === cleanedQuery) {
    score = 100;
  } else if (cleanedFolder.startsWith(cleanedQuery) || baseFolder.startsWith(cleanedQuery)) {
    score = 85;
  } else {
    const queryTokens = cleanedQuery.split(" ").filter(Boolean);
    const folderTokens = cleanedFolder.split(" ").filter(Boolean);
    const allFound =
      queryTokens.length > 0 &&
      queryTokens.every((t) => folderTokens.includes(t) || cleanedFolder.includes(t));
    if (allFound) {
      score = 70;
    }
  }

  // Bonus/penalty for release year alignment
  if (score > 0 && year) {
    if (folderName.includes(String(year))) {
      score += 20;
    } else if (folderName.includes(String(year - 1)) || folderName.includes(String(year + 1))) {
      score += 10;
    }
  }

  return score;
}

interface CandidateDirectory {
  url: string;
  host: string;
  priority: 1 | 2 | 3;
}

/**
 * Builds candidate directories across all DhakaFlix servers
 */
function getCandidateMovieDirectories(year?: number): CandidateDirectory[] {
  const y = year || new Date().getFullYear();
  const dirs: CandidateDirectory[] = [];

  // Group 1: Exact target year across all regional industries
  dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/English%20Movies%20%281080p%29/%28${y}%29%201080p/`, host: HOST_14, priority: 1 });
  dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/Hindi%20Movies/%28${y}%29/`, host: HOST_14, priority: 1 });
  dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/%28${y}%29/`, host: HOST_14, priority: 1 });
  dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/${y}/`, host: HOST_14, priority: 1 });
  dirs.push({ url: `${HOST_7}/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/%28${y}%29/`, host: HOST_7, priority: 1 });
  dirs.push({ url: `${HOST_7}/DHAKA-FLIX-7/English%20Movies/%28${y}%29/`, host: HOST_7, priority: 1 });
  dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/`, host: HOST_14, priority: 1 });
  dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/Animation%20Movies/%28${y}%29/`, host: HOST_14, priority: 1 });
  dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/IMDb%20Top-250%20Movies/`, host: HOST_14, priority: 1 });

  // Group 2: Adjacent years (y - 1 and y + 1)
  for (const adj of [y - 1, y + 1]) {
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/English%20Movies%20%281080p%29/%28${adj}%29%201080p/`, host: HOST_14, priority: 2 });
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/Hindi%20Movies/%28${adj}%29/`, host: HOST_14, priority: 2 });
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/%28${adj}%29/`, host: HOST_14, priority: 2 });
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/${adj}/`, host: HOST_14, priority: 2 });
    dirs.push({ url: `${HOST_7}/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/%28${adj}%29/`, host: HOST_7, priority: 2 });
    dirs.push({ url: `${HOST_7}/DHAKA-FLIX-7/English%20Movies/%28${adj}%29/`, host: HOST_7, priority: 2 });
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/Animation%20Movies/%28${adj}%29/`, host: HOST_14, priority: 2 });
  }

  // Pre-1996 / Pre-2000 Archive Buckets
  if (y <= 1995) {
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/English%20Movies%20%281080p%29/%281995%29%201080p%20%26%20Before/`, host: HOST_14, priority: 2 });
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/Hindi%20Movies/%281995%29%20%26%20Before/`, host: HOST_14, priority: 2 });
    dirs.push({ url: `${HOST_7}/DHAKA-FLIX-7/English%20Movies/%281960-1994%29/`, host: HOST_7, priority: 2 });
  }
  if (y <= 2009) {
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/%282009%29%20%26%20Before/`, host: HOST_14, priority: 2 });
  }
  if (y <= 2000) {
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/2000%20%26%20Before/`, host: HOST_14, priority: 2 });
    dirs.push({ url: `${HOST_14}/DHAKA-FLIX-14/Animation%20Movies/%282000%29%20%26%20Before/`, host: HOST_14, priority: 2 });
  }
  if (y <= 1999) {
    dirs.push({ url: `${HOST_7}/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/%281999%29%20%26%20Before/`, host: HOST_7, priority: 2 });
  }

  // Group 3: Collections & Foreign Language Archives
  dirs.push({ url: `${HOST_7}/DHAKA-FLIX-7/3D%20Movies/`, host: HOST_7, priority: 3 });
  dirs.push({
    url: `${HOST_14}/DHAKA-FLIX-14/English%20Movies%20%281080p%29/Marvel%20Cinematic%20Universe-MCU%20Collection%201080p%20%5BDual%20Audio%5D/`,
    host: HOST_14,
    priority: 3,
  });
  dirs.push({
    url: `${HOST_14}/DHAKA-FLIX-14/English%20Movies%20%281080p%29/007%20James%20Bond%20Films%20Collection%20%281962-2015%29%201080p%20%5BDual%20Audio%5D/`,
    host: HOST_14,
    priority: 3,
  });
  dirs.push({
    url: `${HOST_7}/DHAKA-FLIX-7/English%20Movies/DC%20Extended%20Universe-DCEU%20Collection%20%282008-2019%29%20720p%20%26%201080p%20%5BDual%20Audio%5D/`,
    host: HOST_7,
    priority: 3,
  });
  dirs.push({ url: `${HOST_7}/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/Satyajit%20Ray%20Films/`, host: HOST_7, priority: 3 });
  dirs.push({
    url: `${HOST_14}/DHAKA-FLIX-14/Animation%20Movies/Doraemon-Nobita%20Movies%20Collection%201080p%20%5BMulti%20Audio%5D/`,
    host: HOST_14,
    priority: 3,
  });
  dirs.push({
    url: `${HOST_14}/DHAKA-FLIX-14/Animation%20Movies/Shin-Chan%20Movies%20Collection%201080p%20%5BMulti%20Audio%5D/`,
    host: HOST_14,
    priority: 3,
  });

  const foreignLanguages = [
    "Korean Language",
    "Japanese Language",
    "Chinese Language",
    "Spanish Language",
    "French Language",
    "German Language",
    "Bangla Dubbing Movies",
    "Italian Movie",
    "Russian Language",
    "Iranian Movies",
    "Turkish Language",
    "Thai Language",
    "Indonesian Language",
  ];
  for (const lang of foreignLanguages) {
    dirs.push({
      url: `${HOST_7}/DHAKA-FLIX-7/Foreign%20Language%20Movies/${encodeURIComponent(lang)}/`,
      host: HOST_7,
      priority: 3,
    });
  }

  return dirs;
}

interface CatalogEntry {
  title: string;
  videoUrl: string;
  year?: number;
  quality?: "1080p" | "720p" | "480p" | "360p" | "auto";
  language?: string;
}

let cachedCatalog: CatalogEntry[] | null = null;

function loadCatalog(): CatalogEntry[] {
  if (cachedCatalog !== null) return cachedCatalog;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedCatalog = require("./dhakaflix-catalog.json");
  } catch {
    cachedCatalog = [];
  }
  return cachedCatalog || [];
}

/**
 * Resolves a movie video stream from DhakaFlix across Server 14 and Server 7
 */
export async function resolveDhakaFlixMovie(
  title: string,
  year?: number
): Promise<StreamSource | null> {
  // 1. Fast lookup from prebuilt DhakaFlix catalog (available on live site & edge runtimes)
  const catalog = loadCatalog();
  if (catalog && catalog.length > 0) {
    let topEntry: CatalogEntry | null = null;
    let topScore = 0;

    for (const entry of catalog) {
      const score = scoreFolderMatch(entry.title, title, year);
      if (score > topScore) {
        topScore = score;
        topEntry = entry;
      }
      if (topScore >= 120) break; // Exact match found
    }

    if (topEntry && topScore >= 85) {
      const audioInfo = detectAudioLanguageFromContext(topEntry.title + " " + topEntry.videoUrl);
      const quality = (topEntry.quality || "1080p") as "1080p" | "720p" | "480p";
      const lang = topEntry.language || audioInfo.language;

      return {
        url: topEntry.videoUrl,
        format: "mp4",
        quality,
        serverName: `DhakaFlix (BDIX Local ${quality})`,
        language: lang,
        audioTracks: [
          {
            id: `dhakaflix-audio-${lang}`,
            label: formatAudioLabel({
              language: lang,
              isDub: audioInfo.isDub,
              isOriginal: !audioInfo.isDub,
            }),
            language: lang,
            default: true,
            isDub: audioInfo.isDub,
          },
        ],
      };
    }
  }

  // 2. Real-time dynamic network probe (for localhost or local BDIX network)
  const candidateDirs = getCandidateMovieDirectories(year);

  const priorityGroups = [
    candidateDirs.filter((d) => d.priority === 1),
    candidateDirs.filter((d) => d.priority === 2),
    candidateDirs.filter((d) => d.priority === 3),
  ];

  let bestMatch: { item: DirectoryItem; score: number; dirUrl: string; host: string } | null = null;

  for (const group of priorityGroups) {
    const results = await Promise.all(
      group.map(async (candidate) => {
        const items = await fetchDirectory(candidate.url);
        if (!items || items.length === 0) return null;

        let topItem: DirectoryItem | null = null;
        let topScore = 0;

        for (const item of items) {
          const score = scoreFolderMatch(item.name, title, year);
          if (score > topScore) {
            topScore = score;
            topItem = item;
          }
        }

        if (topItem && topScore > 0) {
          return { item: topItem, score: topScore, dirUrl: candidate.url, host: candidate.host };
        }
        return null;
      })
    );

    for (const res of results) {
      if (res && (!bestMatch || res.score > bestMatch.score)) {
        bestMatch = res;
      }
    }

    // If we found a high confidence match (>= 85 score), resolve immediately
    if (bestMatch && bestMatch.score >= 85) {
      break;
    }
  }

  if (!bestMatch) {
    return null;
  }

  const { item: matchedItem, dirUrl, host } = bestMatch;

  // Check if matched item is directly a media file (e.g. in 3D folder)
  const isDirectVideo = /\.(mp4|mkv|webm)$/i.test(matchedItem.href);
  let videoFileUrl = "";
  let folderUrl = "";
  let subtitleTracks: SubtitleTrack[] = [];
  let videoFileName = matchedItem.name;

  if (isDirectVideo) {
    videoFileUrl = resolveUrl(matchedItem.href, dirUrl, host);
    folderUrl = dirUrl;
  } else {
    // Matched a folder - fetch inside the folder
    folderUrl = resolveUrl(matchedItem.href, dirUrl, host);
    if (!folderUrl.endsWith("/")) folderUrl += "/";

    const fileLinks = await fetchDirectory(folderUrl);
    if (!fileLinks) return null;

    // Filter video files, ignoring sample or trailer files
    const videoFiles = fileLinks.filter(
      (f) =>
        /\.(mp4|mkv|webm)$/i.test(f.href) &&
        !f.name.toLowerCase().includes("sample") &&
        !f.name.toLowerCase().includes("trailer")
    );

    const mainVideo = videoFiles[0] || fileLinks.find((f) => /\.(mp4|mkv|webm)$/i.test(f.href));
    if (!mainVideo) return null;

    videoFileName = mainVideo.name;
    videoFileUrl = resolveUrl(mainVideo.href, folderUrl, host);
    subtitleTracks = extractSubtitlesFromDirectory(fileLinks, folderUrl, host);
  }

  // Detect quality
  const combinedContext = `${dirUrl} ${matchedItem.name} ${videoFileName}`.toLowerCase();
  let quality: "1080p" | "720p" | "480p" | "360p" | "auto" = "1080p";
  if (combinedContext.includes("720p")) {
    quality = "720p";
  } else if (combinedContext.includes("480p")) {
    quality = "480p";
  } else {
    quality = "1080p";
  }

  const serverQualityLabel = combinedContext.includes("2160p") || combinedContext.includes("4k")
    ? "4K"
    : quality;

  const audioInfo = detectAudioLanguageFromContext(combinedContext);

  const audioTracks: AudioTrack[] = [
    {
      id: `dhakaflix-audio-${audioInfo.language}`,
      label: formatAudioLabel({
        language: audioInfo.language,
        isDub: audioInfo.isDub,
        isOriginal: !audioInfo.isDub,
      }),
      language: audioInfo.language,
      default: true,
      isDub: audioInfo.isDub,
    },
  ];

  return {
    url: videoFileUrl,
    format: "mp4", // Direct HTTP range media playback
    quality,
    serverName: `DhakaFlix (BDIX Local ${serverQualityLabel})`,
    language: audioInfo.language,
    audioTracks,
    subtitles: subtitleTracks.length > 0 ? subtitleTracks : undefined,
  };
}

/**
 * Resolves a TV episode video stream from DhakaFlix across Server 12, 14, and 9
 */
export async function resolveDhakaFlixEpisode(
  title: string,
  season: number,
  episode: number
): Promise<StreamSource | null> {
  const cleaned = cleanTitle(title);
  const keywords = cleaned.split(" ").filter((w) => w.length >= 2);
  const firstLetter = cleaned.charAt(0).toUpperCase();

  // Determine alphabetical TV groups
  let tvGroup = "TV Series \u2665  A  —  L";
  if (/[0-9]/.test(firstLetter)) tvGroup = "TV Series \u2605  0  —  9";
  else if (/[M-R]/.test(firstLetter)) tvGroup = "TV Series \u2666  M  —  R";
  else if (/[S-Z]/.test(firstLetter)) tvGroup = "TV Series \u2666  S  —  Z";

  let animeGroup = "Anime-TV Series \u2665  A  —  F";
  if (/[0-9]/.test(firstLetter)) animeGroup = "Anime-TV Series \u2605  0  —  9";
  else if (/[G-M]/.test(firstLetter)) animeGroup = "Anime-TV Series \u2665  G  —  M";
  else if (/[N-S]/.test(firstLetter)) animeGroup = "Anime-TV Series \u2666  N  —  S";
  else if (/[T-Z]/.test(firstLetter)) animeGroup = "Anime-TV Series \u2666  T  —  Z";

  const showDirs = [
    { url: `${HOST_12}/DHAKA-FLIX-12/TV-WEB-Series/${encodeURIComponent(tvGroup)}/`, host: HOST_12 },
    { url: `${HOST_14}/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/`, host: HOST_14 },
    { url: `${HOST_9}/DHAKA-FLIX-9/Anime%20%26%20Cartoon%20TV%20Series/${encodeURIComponent(animeGroup)}/`, host: HOST_9 },
  ];

  let matchedShow: DirectoryItem | null = null;
  let showBaseUrl = "";
  let hostFound = "";

  for (const sd of showDirs) {
    const list = await fetchDirectory(sd.url);
    if (!list) continue;

    const found = list.find((item) => {
      const c = cleanTitle(item.name);
      return keywords.every((k) => c.includes(k));
    });

    if (found) {
      matchedShow = found;
      showBaseUrl = resolveUrl(found.href, sd.url, sd.host);
      if (!showBaseUrl.endsWith("/")) showBaseUrl += "/";
      hostFound = sd.host;
      break;
    }
  }

  if (!matchedShow) return null;

  // Inspect show directory contents dynamically
  const showItems = await fetchDirectory(showBaseUrl);
  if (!showItems) return null;

  // Match season folder flexibly: "Season 1", "Season 01", "Season 1 (Hindi Dubbed)", "S01"
  const seasonPattern = new RegExp(`(season\\s*0?${season}\\b|s0?${season}\\b)`, "i");
  const seasonFolder = showItems.find((item) => seasonPattern.test(item.name));

  let targetFiles: DirectoryItem[] = [];
  let targetFolderUrl = showBaseUrl;

  if (seasonFolder) {
    targetFolderUrl = resolveUrl(seasonFolder.href, showBaseUrl, hostFound);
    if (!targetFolderUrl.endsWith("/")) targetFolderUrl += "/";
    targetFiles = (await fetchDirectory(targetFolderUrl)) || [];
  } else {
    // Direct episodes inside show folder (mini-series / single season releases)
    targetFiles = showItems;
  }

  const epPad = String(episode).padStart(2, "0");
  const seasonPad = String(season).padStart(2, "0");
  const epPattern = new RegExp(`(s0?${seasonPad}e0?${epPad}|e0?${epPad}\\b|episode\\s*0?${episode}\\b)`, "i");

  const matchedEp = targetFiles.find(
    (f) =>
      epPattern.test(f.name) &&
      /\.(mp4|mkv|webm)$/i.test(f.href) &&
      !f.name.toLowerCase().includes("sample")
  );

  if (matchedEp) {
    const fileUrl = resolveUrl(matchedEp.href, targetFolderUrl, hostFound);
    const subtitleTracks = extractSubtitlesFromDirectory(targetFiles, targetFolderUrl, hostFound);
    const audioInfo = detectAudioLanguageFromContext(`${matchedShow.name} ${matchedEp.name}`);

    let quality: "1080p" | "720p" = "720p";
    if (matchedEp.name.includes("1080p") || (seasonFolder && seasonFolder.name.includes("1080p"))) {
      quality = "1080p";
    }

    const audioTracks: AudioTrack[] = [
      {
        id: `dhakaflix-audio-${audioInfo.language}`,
        label: formatAudioLabel({
          language: audioInfo.language,
          isDub: audioInfo.isDub,
          isOriginal: !audioInfo.isDub,
        }),
        language: audioInfo.language,
        default: true,
        isDub: audioInfo.isDub,
      },
    ];

    return {
      url: fileUrl,
      format: "mp4",
      quality,
      serverName: `DhakaFlix (BDIX Local S${season}:E${episode})`,
      language: audioInfo.language,
      audioTracks,
      subtitles: subtitleTracks.length > 0 ? subtitleTracks : undefined,
    };
  }

  return null;
}
