const TMDB_IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

export type PosterSize = "w185" | "w342" | "w500" | "w780" | "original";
export type BackdropSize = "w300" | "w780" | "w1280" | "original";
export type ProfileSize = "w185" | "h632" | "original";

/**
 * Returns full URL for a TMDB poster or null if not provided
 */
export function getPosterUrl(
  path: string | null | undefined,
  size: PosterSize = "w500"
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
}

/**
 * Returns full URL for a TMDB backdrop or null if not provided
 */
export function getBackdropUrl(
  path: string | null | undefined,
  size: BackdropSize = "w1280"
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
}

/**
 * Returns full URL for a TMDB profile or null if not provided
 */
export function getProfileUrl(
  path: string | null | undefined,
  size: ProfileSize = "w185"
): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
}

