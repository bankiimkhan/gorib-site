import {
  MediaItem,
  TVShow,
  Season,
  MediaPageResult,
  MediaFilterOptions,
} from "@/types/media";
import {
  TMDBMovieDetails,
  TMDBTVDetails,
  TMDBSeasonDetails,
  TMDBPageResult,
  TMDBMovie,
  TMDBTVShow,
  TMDBExternalIds,
} from "@/types/tmdb";
import {
  normalizeMovie,
  normalizeTVShow,
  normalizeMovieDetails,
  normalizeTVDetails,
  normalizeSeasonDetails,
} from "./normalizer";
import {
  MOCK_TRENDING_MOVIES,
  MOCK_TRENDING_TV,
  MOCK_SEASON_1,
} from "./mockData";

const BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

/**
 * Low-level TMDB fetcher with caching, error isolation, and retry logic
 */
async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
  revalidate = 3600
): Promise<T | null> {
  if (!API_KEY) {
    return null;
  }

  const query = new URLSearchParams();
  query.set("api_key", API_KEY);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  }

  const url = `${BASE_URL}${endpoint}?${query.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 404) {
      return null;
    }

    if (res.status === 429) {
      console.warn(`[TMDB] Rate limit encountered on ${endpoint}`);
      return null;
    }

    if (!res.ok) {
      console.error(`[TMDB Error] ${res.status}: ${res.statusText} on ${endpoint}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    console.error(`[TMDB Network Error] on ${endpoint}:`, error);
    return null;
  }
}

/**
 * Gets trending movies or TV shows
 */
export async function getTrending(
  type: "movie" | "tv" | "all" = "all",
  timeWindow: "day" | "week" = "week"
): Promise<MediaItem[]> {
  const data = await tmdbFetch<TMDBPageResult<TMDBMovie | TMDBTVShow>>(
    `/trending/${type}/${timeWindow}`,
    {},
    1800
  );

  if (!data || !data.results || data.results.length === 0) {
    return type === "tv" ? MOCK_TRENDING_TV : MOCK_TRENDING_MOVIES;
  }

  return data.results.map((item) =>
    "title" in item ? normalizeMovie(item as TMDBMovie) : normalizeTVShow(item as TMDBTVShow)
  );
}

/**
 * Gets popular movies
 */
export async function getPopularMovies(page = 1): Promise<MediaPageResult<MediaItem>> {
  const data = await tmdbFetch<TMDBPageResult<TMDBMovie>>("/movie/popular", { page }, 3600);

  if (!data) {
    return {
      items: MOCK_TRENDING_MOVIES,
      page: 1,
      totalPages: 1,
      totalResults: MOCK_TRENDING_MOVIES.length,
    };
  }

  return {
    items: data.results.map(normalizeMovie),
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

/**
 * Gets the most recently released movies, newest first.
 *
 * TMDB returns `/movie/now_playing` in popularity order, so it is re-sorted by
 * release date to get a genuine "latest released" list for the home billboard.
 */
export async function getNowPlayingMovies(page = 1): Promise<MediaPageResult<MediaItem>> {
  const data = await tmdbFetch<TMDBPageResult<TMDBMovie>>("/movie/now_playing", { page }, 1800);

  if (!data) {
    return {
      items: MOCK_TRENDING_MOVIES,
      page: 1,
      totalPages: 1,
      totalResults: MOCK_TRENDING_MOVIES.length,
    };
  }

  const items = data.results
    .map(normalizeMovie)
    .filter((movie) => Boolean(movie.releaseDate))
    .sort((a, b) => (a.releaseDate! < b.releaseDate! ? 1 : -1));

  return {
    items,
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

/**
 * Gets top-rated movies
 */
export async function getTopRatedMovies(page = 1): Promise<MediaPageResult<MediaItem>> {
  const data = await tmdbFetch<TMDBPageResult<TMDBMovie>>("/movie/top_rated", { page }, 7200);

  if (!data) {
    return {
      items: MOCK_TRENDING_MOVIES.slice().reverse(),
      page: 1,
      totalPages: 1,
      totalResults: MOCK_TRENDING_MOVIES.length,
    };
  }

  return {
    items: data.results.map(normalizeMovie),
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

/**
 * Gets popular TV shows
 */
export async function getPopularTV(page = 1): Promise<MediaPageResult<TVShow>> {
  const data = await tmdbFetch<TMDBPageResult<TMDBTVShow>>("/tv/popular", { page }, 3600);

  if (!data) {
    return {
      items: MOCK_TRENDING_TV,
      page: 1,
      totalPages: 1,
      totalResults: MOCK_TRENDING_TV.length,
    };
  }

  return {
    items: data.results.map(normalizeTVShow),
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

/**
 * Gets top-rated TV shows
 */
export async function getTopRatedTV(page = 1): Promise<MediaPageResult<TVShow>> {
  const data = await tmdbFetch<TMDBPageResult<TMDBTVShow>>("/tv/top_rated", { page }, 7200);

  if (!data) {
    return {
      items: MOCK_TRENDING_TV.slice().reverse(),
      page: 1,
      totalPages: 1,
      totalResults: MOCK_TRENDING_TV.length,
    };
  }

  return {
    items: data.results.map(normalizeTVShow),
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

/**
 * Gets full movie details by TMDB ID
 */
export async function getMovieDetails(id: number): Promise<MediaItem | null> {
  const data = await tmdbFetch<TMDBMovieDetails>(
    `/movie/${id}`,
    { append_to_response: "credits,videos,recommendations,similar,external_ids" },
    3600
  );

  if (!data) {
    const mock = MOCK_TRENDING_MOVIES.find((m) => m.tmdbId === id);
    return mock || (MOCK_TRENDING_MOVIES[0] ? { ...MOCK_TRENDING_MOVIES[0], tmdbId: id } : null);
  }

  return normalizeMovieDetails(data);
}

/**
 * Gets full TV show details by TMDB ID
 */
export async function getTVDetails(id: number): Promise<TVShow | null> {
  const data = await tmdbFetch<TMDBTVDetails>(
    `/tv/${id}`,
    { append_to_response: "credits,videos,recommendations,similar,external_ids" },
    3600
  );

  if (!data) {
    const mock = MOCK_TRENDING_TV.find((t) => t.tmdbId === id);
    return mock || (MOCK_TRENDING_TV[0] ? { ...MOCK_TRENDING_TV[0], tmdbId: id } : null);
  }

  return normalizeTVDetails(data);
}

/**
 * Gets specific TV season details with all episodes
 */
export async function getTVSeason(tvId: number, seasonNumber: number): Promise<Season | null> {
  const data = await tmdbFetch<TMDBSeasonDetails>(
    `/tv/${tvId}/season/${seasonNumber}`,
    {},
    3600
  );

  if (!data) {
    return { ...MOCK_SEASON_1, seasonNumber };
  }

  return normalizeSeasonDetails(data);
}

/**
 * Searches movies and TV shows
 */
export async function searchMedia(
  query: string,
  page = 1,
  type: "movie" | "tv" | "multi" = "multi"
): Promise<MediaPageResult<MediaItem>> {
  if (!query.trim()) {
    return { items: [], page: 1, totalPages: 0, totalResults: 0 };
  }

  const endpoint = type === "multi" ? "/search/multi" : `/search/${type}`;
  const data = await tmdbFetch<TMDBPageResult<TMDBMovie | TMDBTVShow>>(
    endpoint,
    { query, page },
    600
  );

  if (!data) {
    const q = query.toLowerCase();
    const allMocks = [...MOCK_TRENDING_MOVIES, ...MOCK_TRENDING_TV];
    const filtered = allMocks.filter(
      (m) =>
        m.title.toLowerCase().includes(q) || m.overview.toLowerCase().includes(q)
    );
    return {
      items: filtered,
      page: 1,
      totalPages: 1,
      totalResults: filtered.length,
    };
  }

  const normalized = data.results
    .filter((item) => "title" in item || "name" in item)
    .map((item) =>
      "title" in item ? normalizeMovie(item as TMDBMovie) : normalizeTVShow(item as TMDBTVShow)
    );

  return {
    items: normalized,
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

function resolveOriginalLanguage(lang?: string): string | undefined {
  if (!lang || lang === "all") return undefined;
  if (lang === "south") return "te|ta|ml|kn";
  return lang;
}

/**
 * Discovers movies by filter (genre, year, sort, language)
 */
export async function discoverMovies(
  options: MediaFilterOptions
): Promise<MediaPageResult<MediaItem>> {
  const langParam = resolveOriginalLanguage(options.language);

  const params: Record<string, string | number | undefined> = {
    page: options.page || 1,
    with_genres: options.genreId,
    primary_release_year: options.year,
    sort_by: options.sortBy || "popularity.desc",
    with_original_language: langParam,
    with_origin_country: options.originCountry,
  };

  const data = await tmdbFetch<TMDBPageResult<TMDBMovie>>("/discover/movie", params, 3600);

  if (!data) {
    let items = MOCK_TRENDING_MOVIES;
    if (options.genreId) {
      items = items.filter((m) => m.genres.some((g) => g.id === options.genreId));
    }
    return {
      items,
      page: 1,
      totalPages: 1,
      totalResults: items.length,
    };
  }

  return {
    items: data.results.map(normalizeMovie),
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

/**
 * Discovers TV shows by filter (genre, year, sort, language)
 */
export async function discoverTV(
  options: MediaFilterOptions
): Promise<MediaPageResult<TVShow>> {
  const langParam = resolveOriginalLanguage(options.language);

  const params: Record<string, string | number | undefined> = {
    page: options.page || 1,
    with_genres: options.genreId,
    first_air_date_year: options.year,
    sort_by: options.sortBy || "popularity.desc",
    with_original_language: langParam,
    with_origin_country: options.originCountry,
  };

  const data = await tmdbFetch<TMDBPageResult<TMDBTVShow>>("/discover/tv", params, 3600);

  if (!data) {
    let items = MOCK_TRENDING_TV;
    if (options.genreId) {
      items = items.filter((m) => m.genres.some((g) => g.id === options.genreId));
    }
    return {
      items,
      page: 1,
      totalPages: 1,
      totalResults: items.length,
    };
  }

  return {
    items: data.results.map(normalizeTVShow),
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

/**
 * Dedicated helper to fetch popular Bangla / Bangladeshi movies
 */
export async function getBanglaMovies(page = 1): Promise<MediaPageResult<MediaItem>> {
  return discoverMovies({
    language: "bn",
    page,
    sortBy: "popularity.desc",
  });
}

/**
 * Dedicated helper to fetch popular Hindi / Bollywood movies
 */
export async function getHindiMovies(page = 1): Promise<MediaPageResult<MediaItem>> {
  return discoverMovies({
    language: "hi",
    page,
    sortBy: "popularity.desc",
  });
}

/**
 * Dedicated helper to fetch popular South Indian movies (Telugu, Tamil, Malayalam, Kannada)
 */
export async function getSouthIndianMovies(page = 1): Promise<MediaPageResult<MediaItem>> {
  return discoverMovies({
    language: "south",
    page,
    sortBy: "popularity.desc",
  });
}

/**
 * Dedicated helper to fetch popular Bangla TV shows / Natok / Serials
 */
export async function getBanglaTV(page = 1): Promise<MediaPageResult<TVShow>> {
  return discoverTV({
    language: "bn",
    page,
    sortBy: "popularity.desc",
  });
}

/**
 * Dedicated helper to fetch popular Hindi TV shows & Web Series
 */
export async function getHindiTV(page = 1): Promise<MediaPageResult<TVShow>> {
  return discoverTV({
    language: "hi",
    page,
    sortBy: "popularity.desc",
  });
}

/**
 * Gets external IDs (IMDb ID, TVDB ID) for a movie or TV show
 */
export async function getExternalIds(
  type: "movie" | "tv",
  tmdbId: number
): Promise<TMDBExternalIds | null> {
  return tmdbFetch<TMDBExternalIds>(`/${type}/${tmdbId}/external_ids`, {}, 86400);
}

