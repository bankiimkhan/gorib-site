import { Genre } from "@/types/media";

export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: "Action", slug: "action" },
  { id: 12, name: "Adventure", slug: "adventure" },
  { id: 16, name: "Animation", slug: "animation" },
  { id: 35, name: "Comedy", slug: "comedy" },
  { id: 80, name: "Crime", slug: "crime" },
  { id: 99, name: "Documentary", slug: "documentary" },
  { id: 18, name: "Drama", slug: "drama" },
  { id: 10751, name: "Family", slug: "family" },
  { id: 14, name: "Fantasy", slug: "fantasy" },
  { id: 36, name: "History", slug: "history" },
  { id: 27, name: "Horror", slug: "horror" },
  { id: 10402, name: "Music", slug: "music" },
  { id: 9648, name: "Mystery", slug: "mystery" },
  { id: 10749, name: "Romance", slug: "romance" },
  { id: 878, name: "Sci-Fi", slug: "sci-fi" },
  { id: 10770, name: "TV Movie", slug: "tv-movie" },
  { id: 53, name: "Thriller", slug: "thriller" },
  { id: 10752, name: "War", slug: "war" },
  { id: 37, name: "Western", slug: "western" },
];

export const TV_GENRES: Genre[] = [
  { id: 10759, name: "Action & Adventure", slug: "action-adventure" },
  { id: 16, name: "Animation", slug: "animation" },
  { id: 35, name: "Comedy", slug: "comedy" },
  { id: 80, name: "Crime", slug: "crime" },
  { id: 99, name: "Documentary", slug: "documentary" },
  { id: 18, name: "Drama", slug: "drama" },
  { id: 10751, name: "Family", slug: "family" },
  { id: 10762, name: "Kids", slug: "kids" },
  { id: 9648, name: "Mystery", slug: "mystery" },
  { id: 10763, name: "News", slug: "news" },
  { id: 10764, name: "Reality", slug: "reality" },
  { id: 10765, name: "Sci-Fi & Fantasy", slug: "sci-fi-fantasy" },
  { id: 10766, name: "Soap", slug: "soap" },
  { id: 10767, name: "Talk", slug: "talk" },
  { id: 10768, name: "War & Politics", slug: "war-politics" },
  { id: 37, name: "Western", slug: "western" },
];

export const ALL_GENRES: Genre[] = Array.from(
  new Map(
    [...MOVIE_GENRES, ...TV_GENRES].map((g) => [g.slug, g])
  ).values()
);

export function getGenreById(id: number): Genre | undefined {
  return ALL_GENRES.find((g) => g.id === id);
}

export function getGenreBySlug(slug: string): Genre | undefined {
  return ALL_GENRES.find((g) => g.slug.toLowerCase() === slug.toLowerCase());
}

/**
 * TMDB uses different genre ids for movies and TV (e.g. Action is 28 for
 * movies but TV only has "Action & Adventure" 10759). Maps a genre page slug to
 * the closest id on each side; `undefined` means that side has no equivalent.
 */
const CROSS_GENRE_MAP: Record<string, { movie?: number; tv?: number }> = {
  action: { movie: 28, tv: 10759 },
  adventure: { movie: 12, tv: 10759 },
  "action-adventure": { movie: 28, tv: 10759 },
  "sci-fi": { movie: 878, tv: 10765 },
  fantasy: { movie: 14, tv: 10765 },
  "sci-fi-fantasy": { movie: 878, tv: 10765 },
  war: { movie: 10752, tv: 10768 },
  "war-politics": { movie: 10752, tv: 10768 },
  kids: { movie: 10751, tv: 10762 },
};

export function getGenreIdsForSlug(slug: string): { movie?: number; tv?: number } {
  const key = slug.toLowerCase();
  if (CROSS_GENRE_MAP[key]) return CROSS_GENRE_MAP[key];
  return {
    movie: MOVIE_GENRES.find((g) => g.slug === key)?.id,
    tv: TV_GENRES.find((g) => g.slug === key)?.id,
  };
}

export { slugify } from "@/lib/utils/formatters";


