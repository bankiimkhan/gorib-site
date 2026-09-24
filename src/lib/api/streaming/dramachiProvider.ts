import { StreamSource } from "@/types/streaming";

/**
 * Dramachi stream source (Asian dramas & movies)
 * Flow: search -> title_v2 (season versions) -> eplist (episodes of a version) -> getFile (CDN host + path)
 * Files are direct MKV downloads served with range support, so they play through a plain <video src>
 * wherever the browser can decode them (mostly HEVC/AAC; Chromium with hardware HEVC decoding).
 */

const BASE_URL = "https://api.nodeobjects.com/";
const REQUEST_TIMEOUT_MS = 6000;
const METADATA_REVALIDATE_SECONDS = 3600;
const MOVIE_RIP = "hd Rip";

interface SearchItem {
  id: string;
  title: string;
  common_title?: string | null;
  year?: string;
  content?: string;
}

interface SeasonVersion {
  version_name: string;
  rip: string;
}

interface TitleDetails {
  seasons?: Record<string, { versions?: SeasonVersion[] }>;
}

interface EpisodeItem {
  f_title: string;
  fid: string;
  disk: string;
  quality?: string;
}

interface FileInfoResponse {
  fileInfo?: { url?: string }[];
  hostInfo?: { host?: string };
}

async function getJson<T>(params: Record<string, string>, revalidate: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = `${BASE_URL}?${new URLSearchParams(params).toString()}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+(19|20)\d{2}$/, "") // movie titles carry a trailing year ("Parasite 2019")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Requires an exact normalized title match, then prefers the closest year */
export function pickMatch(
  items: SearchItem[],
  params: { title: string; year?: number; isMovie: boolean }
): SearchItem | null {
  const wanted = normalizeTitle(params.title);
  const candidates = items.filter((item) => {
    const isMovie = item.content === "movies" || item.content === "movie";
    if (isMovie !== params.isMovie) return false;
    return [item.title, item.common_title].some((t) => t && normalizeTitle(t) === wanted);
  });
  if (!params.year) return candidates[0] ?? null;
  return (
    candidates.find((item) => {
      const itemYear = parseInt(item.year || "", 10);
      return !isNaN(itemYear) && Math.abs(itemYear - params.year!) <= 1;
    }) ?? null
  );
}

export function parseEpisodeNumber(fTitle: string): number | null {
  const tagged = fTitle.toUpperCase().match(/E(\d+)(?!.*E\d)/);
  if (tagged) return parseInt(tagged[1], 10);
  const trailing = fTitle.trim().split(/\s+/).pop();
  return trailing && /^\d+$/.test(trailing) ? parseInt(trailing, 10) : null;
}

function seasonKey(season: number): string {
  return `Season ${String(season).padStart(2, "0")}`;
}

function toQuality(raw?: string): StreamSource["quality"] {
  if (!raw) return "auto";
  const height = parseInt(raw, 10);
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 480) return "480p";
  if (height > 0) return "360p";
  return "auto";
}

async function resolveFileUrl(episode: EpisodeItem): Promise<string | null> {
  const data = await getJson<FileInfoResponse>(
    { interface: "getFile", fid: episode.fid, findex: episode.disk },
    0 // CDN host rotates; don't cache
  );
  const path = data?.fileInfo?.[0]?.url;
  const host = data?.hostInfo?.host;
  if (!path || !host) return null;
  return `https://${host.replace(/\/+$/, "")}/cdn/${path.replace(/^\/+/, "")}`;
}

async function findTitle(params: { title: string; year?: number; isMovie: boolean }) {
  const search = await getJson<{ data?: SearchItem[] }>(
    { interface: "search", q: params.title, filter: "all", page: "1" },
    METADATA_REVALIDATE_SECONDS
  );
  const match = pickMatch(search?.data ?? [], params);
  if (!match) return null;
  const details = await getJson<TitleDetails>(
    { interface: "title_v2", id: match.id },
    METADATA_REVALIDATE_SECONDS
  );
  return details ? { id: match.id, details } : null;
}

function fetchEpisodes(titleId: string, rip: string) {
  return getJson<{ episode_list?: EpisodeItem[] }>(
    { interface: "eplist", season: rip, id: titleId },
    METADATA_REVALIDATE_SECONDS
  ).then((res) => res?.episode_list ?? []);
}

/** One source per audio version (Original / Dub / Hindi Dub) of the requested episode */
export async function getDramachiEpisodeSources(params: {
  title: string;
  year?: number;
  season: number;
  episode: number;
}): Promise<StreamSource[]> {
  const found = await findTitle({ title: params.title, year: params.year, isMovie: false });
  const versions = found?.details.seasons?.[seasonKey(params.season)]?.versions ?? [];
  if (!found || versions.length === 0) return [];

  const perVersion = await Promise.all(
    versions.map(async (version): Promise<StreamSource | null> => {
      const episodes = await fetchEpisodes(found.id, version.rip);
      const match = episodes.find((ep) => parseEpisodeNumber(ep.f_title) === params.episode);
      if (!match?.fid || !match.disk) return null;
      const url = await resolveFileUrl(match);
      if (!url) return null;
      return {
        url,
        format: "mp4", // MKV file; the player hands any non-HLS source to <video src>
        quality: toQuality(match.quality),
        language: version.version_name,
        serverName: `Dramachi · ${version.version_name}`,
      };
    })
  );
  return perVersion.filter((s): s is StreamSource => s !== null);
}

/** Older movies are split into parts ("Parasite 2019 001", "002"), each exposed as its own source */
export async function getDramachiMovieSources(params: { title: string; year?: number }): Promise<StreamSource[]> {
  const found = await findTitle({ ...params, isMovie: true });
  if (!found) return [];
  const rip = found.details.seasons?.[MOVIE_RIP]?.versions?.[0]?.rip ?? MOVIE_RIP;

  const parts = (await fetchEpisodes(found.id, rip))
    .filter((ep) => ep.fid && ep.disk)
    .sort((a, b) => (parseEpisodeNumber(a.f_title) ?? 0) - (parseEpisodeNumber(b.f_title) ?? 0));

  const urls = await Promise.all(parts.map(resolveFileUrl));
  return parts.flatMap((part, i): StreamSource[] => {
    const url = urls[i];
    if (!url) return [];
    return [
      {
        url,
        format: "mp4",
        quality: toQuality(part.quality),
        serverName: parts.length > 1 ? `Dramachi · Part ${i + 1} of ${parts.length}` : "Dramachi",
      },
    ];
  });
}
