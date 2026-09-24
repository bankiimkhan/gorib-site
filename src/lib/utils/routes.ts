import { MediaItem } from "@/types/media";

type Routable = Pick<MediaItem, "type" | "tmdbId">;

/** Details page for a title. */
export function mediaHref(item: Routable): string {
  return item.type === "tv" ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;
}

/** Player page for a title (TV defaults to the first episode). */
export function watchHref(item: Routable): string {
  return item.type === "tv" ? `/watch/tv/${item.tmdbId}` : `/watch/movie/${item.tmdbId}`;
}

export function episodeHref(tmdbId: number, season: number, episode: number): string {
  return `/watch/tv/${tmdbId}?season=${season}&episode=${episode}`;
}
