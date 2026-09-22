import {
  MediaItem,
  TVShow,
  Season,
  Episode,
  Genre,
  CastMember,
  CrewMember,
} from "@/types/media";
import {
  TMDBMovie,
  TMDBTVShow,
  TMDBMovieDetails,
  TMDBTVDetails,
  TMDBSeasonDetails,
  TMDBGenre,
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

/**
 * Normalizes a basic TMDB movie item
 */
export function normalizeMovie(item: TMDBMovie): MediaItem {
  return {
    id: `movie-${item.id}`,
    tmdbId: item.id,
    type: "movie",
    title: item.title || "Untitled",
    originalTitle: item.original_title,
    overview: item.overview || "No overview available.",
    posterUrl: getPosterUrl(item.poster_path, "w500"),
    backdropUrl: getBackdropUrl(item.backdrop_path, "w1280"),
    releaseDate: item.release_date,
    year: formatYear(item.release_date),
    rating: item.vote_average || 0,
    voteCount: item.vote_count || 0,
    popularity: item.popularity || 0,
    genres: mapGenreIds(item.genre_ids),
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
    posterUrl: getPosterUrl(item.poster_path, "w500"),
    backdropUrl: getBackdropUrl(item.backdrop_path, "w1280"),
    releaseDate: item.first_air_date,
    year: formatYear(item.first_air_date),
    rating: item.vote_average || 0,
    voteCount: item.vote_count || 0,
    popularity: item.popularity || 0,
    genres: mapGenreIds(item.genre_ids),
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
  const trailer = item.videos?.results?.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;

  return {
    ...base,
    imdbId: item.imdb_id || item.external_ids?.imdb_id || undefined,
    genres: mapGenreObjects(item.genres).length > 0 ? mapGenreObjects(item.genres) : base.genres,
    runtime: item.runtime || undefined,
    tagline: item.tagline || undefined,
    status: item.status,
    director,
    cast,
    crew,
    trailerUrl,
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
      posterUrl: getPosterUrl(s.poster_path, "w500"),
      episodeCount: s.episode_count,
      airDate: s.air_date || undefined,
    })) || [];

  const trailer = item.videos?.results?.find(
    (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
  );
  const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;

  return {
    ...base,
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
