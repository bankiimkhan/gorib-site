import { StreamSource } from "@/types/streaming";

const MOVIE_HOST = process.env.DHAKA_FLIX_MOVIE_HOST || "http://172.16.50.14";
const TV_HOST = process.env.DHAKA_FLIX_TV_HOST || "http://172.16.50.12";

/**
 * Normalizes title for loose folder matching (removes symbols, accents, lowercase)
 */
function cleanTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[:&'-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts links from an h5ai / Nginx HTML directory listing
 */
function extractDirectoryLinks(html: string): { href: string; name: string }[] {
  const regex = /<a href="([^"]+)">([^<]+)<\/a>/g;
  const links: { href: string; name: string }[] = [];
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
 * Fetches an HTML directory page with timeout
 */
async function fetchDirectory(url: string, timeoutMs = 2500): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "gorib.lol-media-resolver/1.0" },
    });

    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Resolves a movie video stream from DhakaFlix (172.16.50.14)
 */
export async function resolveDhakaFlixMovie(
  title: string,
  year?: number
): Promise<StreamSource | null> {
  const cleaned = cleanTitle(title);
  const keywords = cleaned.split(" ").filter((w) => w.length > 2);
  const searchYear = year || new Date().getFullYear();

  // Search candidate directories
  const candidateDirs = [
    `${MOVIE_HOST}/DHAKA-FLIX-14/English%20Movies%20%281080p%29/%28${searchYear}%29%201080p/`,
    `${MOVIE_HOST}/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/`,
    `${MOVIE_HOST}/DHAKA-FLIX-14/English%20Movies%20%281080p%29/%28${searchYear - 1}%29%201080p/`,
    `${MOVIE_HOST}/DHAKA-FLIX-14/Hindi%20Movies/`,
  ];

  for (const dirUrl of candidateDirs) {
    const html = await fetchDirectory(dirUrl);
    if (!html) continue;

    const links = extractDirectoryLinks(html);

    // Find folder matching title keywords
    const matchedFolder = links.find((link) => {
      const folderClean = cleanTitle(link.name);
      return keywords.every((k) => folderClean.includes(k));
    });

    if (matchedFolder) {
      // Query inside matched folder
      const folderUrl = matchedFolder.href.startsWith("http")
        ? matchedFolder.href
        : `${MOVIE_HOST}${matchedFolder.href}`;

      const folderHtml = await fetchDirectory(folderUrl);
      if (!folderHtml) continue;

      const fileLinks = extractDirectoryLinks(folderHtml);
      const videoFile = fileLinks.find((f) =>
        /\.(mp4|mkv|webm)$/i.test(f.href)
      );

      if (videoFile) {
        const fileUrl = videoFile.href.startsWith("http")
          ? videoFile.href
          : `${MOVIE_HOST}${videoFile.href}`;

        return {
          url: fileUrl,
          format: "mp4", // HTML5 video can play direct HTTP range media
          quality: "1080p",
          serverName: "DhakaFlix (BDIX Local 1080p)",
        };
      }
    }
  }

  return null;
}

/**
 * Resolves a TV episode video stream from DhakaFlix (172.16.50.12)
 */
export async function resolveDhakaFlixEpisode(
  title: string,
  season: number,
  episode: number
): Promise<StreamSource | null> {
  const cleaned = cleanTitle(title);
  const firstLetter = cleaned.charAt(0).toUpperCase();

  // Determine alphabetical group
  let group = "TV Series \u2665  A  —  L";
  if (/[0-9]/.test(firstLetter)) {
    group = "TV Series \u2605  0  —  9";
  } else if (/[M-R]/.test(firstLetter)) {
    group = "TV Series \u2666  M  —  R";
  } else if (/[S-Z]/.test(firstLetter)) {
    group = "TV Series \u2666  S  —  Z";
  }

  const groupUrl = `${TV_HOST}/DHAKA-FLIX-12/TV-WEB-Series/${encodeURIComponent(group)}/`;
  const html = await fetchDirectory(groupUrl);
  if (!html) return null;

  const links = extractDirectoryLinks(html);
  const keywords = cleaned.split(" ").filter((w) => w.length > 2);

  const matchedShow = links.find((link) => {
    const showClean = cleanTitle(link.name);
    return keywords.every((k) => showClean.includes(k));
  });

  if (!matchedShow) return null;

  // Search inside Season folder
  const showUrl = matchedShow.href.startsWith("http")
    ? matchedShow.href
    : `${TV_HOST}${matchedShow.href}`;

  const seasonUrl = `${showUrl}Season%20${season}/`;
  const seasonHtml = await fetchDirectory(seasonUrl);
  if (!seasonHtml) return null;

  const episodeFiles = extractDirectoryLinks(seasonHtml);

  // Match episode e.g. S01E02 or E02
  const epPad = String(episode).padStart(2, "0");
  const seasonPad = String(season).padStart(2, "0");
  const epPattern = new RegExp(`(s${seasonPad}e${epPad}|e${epPad}|episode\\s*${episode})`, "i");

  const matchedEp = episodeFiles.find(
    (f) => epPattern.test(f.name) && /\.(mp4|mkv|webm)$/i.test(f.href)
  );

  if (matchedEp) {
    const fileUrl = matchedEp.href.startsWith("http")
      ? matchedEp.href
      : `${TV_HOST}${matchedEp.href}`;

    return {
      url: fileUrl,
      format: "mp4",
      quality: "720p",
      serverName: `DhakaFlix (BDIX Local S${season}:E${episode})`,
    };
  }

  return null;
}

