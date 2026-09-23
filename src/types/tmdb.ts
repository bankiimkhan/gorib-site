export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  adult: boolean;
  original_language?: string;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  original_language?: string;
}

export interface TMDBSpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

export interface TMDBTranslationData {
  title?: string;
  name?: string;
  overview?: string;
  tagline?: string;
}

export interface TMDBTranslation {
  iso_3166_1: string;
  iso_639_1: string;
  name: string;
  english_name: string;
  data?: TMDBTranslationData;
}

export interface TMDBTranslationsResult {
  id: number;
  translations: TMDBTranslation[];
}

export interface TMDBMovieDetails extends TMDBMovie {
  genres: TMDBGenre[];
  runtime: number | null;
  tagline: string | null;
  status: string;
  imdb_id: string | null;
  spoken_languages?: TMDBSpokenLanguage[];
  credits?: TMDBCredits;
  videos?: TMDBVideos;
  recommendations?: TMDBPageResult<TMDBMovie>;
  similar?: TMDBPageResult<TMDBMovie>;
  external_ids?: TMDBExternalIds;
}

export interface TMDBTVDetails extends TMDBTVShow {
  genres: TMDBGenre[];
  number_of_seasons: number;
  number_of_episodes: number;
  last_air_date: string | null;
  status: string;
  tagline: string | null;
  spoken_languages?: TMDBSpokenLanguage[];
  seasons: TMDBSeasonSummary[];
  credits?: TMDBCredits;
  videos?: TMDBVideos;
  recommendations?: TMDBPageResult<TMDBTVShow>;
  similar?: TMDBPageResult<TMDBTVShow>;
  external_ids?: TMDBExternalIds;
}

export interface TMDBSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  episode_count: number;
  air_date: string | null;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface TMDBSeasonDetails {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episodes: TMDBEpisode[];
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrew {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface TMDBCredits {
  cast: TMDBCast[];
  crew: TMDBCrew[];
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBVideos {
  results: TMDBVideo[];
}

export interface TMDBExternalIds {
  imdb_id?: string | null;
  tvdb_id?: number | null;
}

export interface TMDBPageResult<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

