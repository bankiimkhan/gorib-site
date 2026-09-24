import {
  MediaItem,
  TVShow,
  Season,
  Episode,
  Genre,
  CastMember,
  CrewMember,
  Review,
} from "@/types/media";
import {
  TMDBMovie,
  TMDBTVShow,
  TMDBMovieDetails,
  TMDBTVDetails,
  TMDBSeasonDetails,
  TMDBGenre,
  TMDBPageResult,
  TMDBReview,
} from "@/types/tmdb";
import { getBackdropUrl, getPosterUrl, getProfileUrl } from "@/lib/utils/images";
import { formatYear, slugify } from "@/lib/utils/formatters";
import { getGenreById } from "./genres";

function mapGenreObjects(genres?: TMDBGenre[]): Genre[] {
  if (!genres || !Array.isArray(genres)) return [];
  return genres.map((g) => ({
    id: g.id,
    name: g.name,
    slug: slugify(g.name),
  }));
}

function mapGenreIds(ids?: number[]): Genre[] {
  if (!ids || !Array.isArray(ids)) return [];
  return ids
    .map((id) => getGenreById(id))
    .filter((g): g is Genre => Boolean(g));
}

const MAX_RELATED = 18;

type TMDBVideo = { site: string; type: string; key: string; official?: boolean };

/** Prefers an official YouTube trailer, then any trailer, then a teaser. */
function pickTrailer(videos?: TMDBVideo[]): TMDBVideo | undefined {
  const yt = (videos || []).filter((v) => v.site === "YouTube");
  return (
    yt.find((v) => v.type === "Trailer" && v.official) ||
    yt.find((v) => v.type === "Trailer") ||
    yt.find((v) => v.type === "Teaser")
  );
}
const MAX_REVIEWS = 6;

/** Recommendations first (TMDB's collaborative filtering), topped up with "similar". */
function mapRelated<T>(
  recommendations: TMDBPageResult<T> | undefined,
  similar: TMDBPageResult<T> | undefined,
  normalize: (item: T) => MediaItem,
  selfId: number
): MediaItem[] {
  const seen = new Set<number>([selfId]);
  const out: MediaItem[] = [];
  for (const raw of [...(recommendations?.results || []), ...(similar?.results || [])]) {
    const item = normalize(raw);
    if (seen.has(item.tmdbId) || !item.posterUrl) continue;
    seen.add(item.tmdbId);
    out.push(item);
    if (out.length >= MAX_RELATED) break;
  }
  return out;
}

function mapReviews(reviews?: TMDBPageResult<TMDBReview>): Review[] {
  return (reviews?.results || []).slice(0, MAX_REVIEWS).map((r) => {
    const avatar = r.author_details?.avatar_path;
    return {
      id: r.id,
      author: r.author_details?.name || r.author || r.author_details?.username || "Anonymous",
      avatarUrl: avatar && !avatar.includes("gravatar") ? getProfileUrl(avatar, "w185") : undefined,
      rating: r.author_details?.rating ?? undefined,
      content: r.content,
      createdAt: r.created_at,
      url: r.url,
    };
  });
}

/**
 * Normalizes a basic TMDB movie item.
 * List posters use w342: cards render at most ~210 CSS px wide, so w500 only
 * wasted bandwidth (images are served unoptimized on Workers).
 */
export function normalizeMovie(item: TMDBMovie): MediaItem {
  return {
    id: `movie-${item.id}`,
    tmdbId: item.id,
    type: "movie",
    title: item.title || "Untitled",
    originalTitle: item.original_title,
    overview: item.overview || "No overview available.",
    posterUrl: getPosterUrl(item.poster_path, "w342"),
    backdropUrl: getBackdropUrl(item.backdrop_path, "w1280"),
    releaseDate: item.release_date,
    year: formatYear(item.release_date),
    rating: item.vote_average || 0,
    voteCount: item.vote_count || 0,
    popularity: item.popularity || 0,
    genres: mapGenreIds(item.genre_ids),
    originalLanguage: item.original_language,
    countries: item.origin_country,
  };
}

/**
 * Normalizes a basic TMDB TV show item
 */
export function normalizeTVShow(item: TMDBTVShow): TVShow {
  return {
    id: `tv-${item.id}`,
    tmdbId: item.id,
    type: "tv",
    title: item.name || "Untitled",
    originalTitle: item.original_name,
    overview: item.overview || "No overview available.",
    posterUrl: getPosterUrl(item.poster_path, "w342"),
    backdropUrl: getBackdropUrl(item.backdrop_path, "w1280"),
    releaseDate: item.first_air_date,
    year: formatYear(item.first_air_date),
    rating: item.vote_average || 0,
    voteCount: item.vote_count || 0,
    popularity: item.popularity || 0,
    genres: mapGenreIds(item.genre_ids),
    originalLanguage: item.original_language,
    countries: item.origin_country,
  };
}

/**
 * Normalizes full TMDB movie details including cast, crew, and trailer
 */
export function normalizeMovieDetails(item: TMDBMovieDetails): MediaItem {
  const base = normalizeMovie(item);

  // Extract director
  const director = item.credits?.crew?.find((c) => c.job === "Director")?.name;

  // Extract top cast (up to 12 members)
  const cast: CastMember[] =
    item.credits?.cast?.slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || "Unknown",
      profileUrl: getProfileUrl(c.profile_path, "w185"),
      order: c.order,
    })) || [];

  // Extract key crew
  const crew: CrewMember[] =
    item.credits?.crew?.slice(0, 8).map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
    })) || [];

  // Extract trailer (YouTube)
  const trailer = pickTrailer(item.videos?.results);
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;

  return {
    ...base,
    posterUrl: getPosterUrl(item.poster_path, "w500"),
    imdbId: item.imdb_id || item.external_ids?.imdb_id || undefined,
    genres: mapGenreObjects(item.genres).length > 0 ? mapGenreObjects(item.genres) : base.genres,
    runtime: item.runtime || undefined,
    tagline: item.tagline || undefined,
    status: item.status,
    director,
    cast,
    crew,
    trailerUrl,
    spokenLanguages: item.spoken_languages?.map((l) => l.iso_639_1),
    countries: item.production_countries?.map((c) => c.iso_3166_1) || base.countries,
    recommendations: mapRelated(item.recommendations, item.similar, normalizeMovie, item.id),
    reviews: mapReviews(item.reviews),
  };
}

/**
 * Normalizes full TMDB TV details
 */
export function normalizeTVDetails(item: TMDBTVDetails): TVShow {
  const base = normalizeTVShow(item);

  const cast: CastMember[] =
    item.credits?.cast?.slice(0, 12).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character || "Unknown",
      profileUrl: getProfileUrl(c.profile_path, "w185"),
      order: c.order,
    })) || [];

  const seasons: Season[] =
    item.seasons?.map((s) => ({
      id: s.id,
      seasonNumber: s.season_number,
      name: s.name,
      overview: s.overview,
      posterUrl: getPosterUrl(s.poster_path, "w342"),
      episodeCount: s.episode_count,
      airDate: s.air_date || undefined,
    })) || [];

  const trailer = pickTrailer(item.videos?.results);
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;

  return {
    ...base,
    posterUrl: getPosterUrl(item.poster_path, "w500"),
    imdbId: item.external_ids?.imdb_id || undefined,
    genres: mapGenreObjects(item.genres).length > 0 ? mapGenreObjects(item.genres) : base.genres,
    totalSeasons: item.number_of_seasons,
    totalEpisodes: item.number_of_episodes,
    lastAirDate: item.last_air_date || undefined,
    tagline: item.tagline || undefined,
    status: item.status,
    seasons,
    cast,
    trailerUrl,
    spokenLanguages: item.spoken_languages?.map((l) => l.iso_639_1),
    recommendations: mapRelated(item.recommendations, item.similar, normalizeTVShow, item.id),
    reviews: mapReviews(item.reviews),
  };
}

/**
 * Normalizes a TMDB Season with its episodes
 */
export function normalizeSeasonDetails(season: TMDBSeasonDetails): Season {
  const episodes: Episode[] = (season.episodes || []).map((ep) => ({
    id: ep.id,
    episodeNumber: ep.episode_number,
    seasonNumber: ep.season_number,
    title: ep.name || `Episode ${ep.episode_number}`,
    overview: ep.overview || "No description provided for this episode.",
    stillUrl: getBackdropUrl(ep.still_path, "w300"),
    airDate: ep.air_date || undefined,
    runtime: ep.runtime || undefined,
    voteAverage: ep.vote_average || 0,
  }));

  return {
    id: season.id,
    seasonNumber: season.season_number,
    name: season.name,
    overview: season.overview,
    posterUrl: getPosterUrl(season.poster_path, "w500"),
    episodeCount: episodes.length,
    airDate: season.air_date || undefined,
    episodes,
  };
}
