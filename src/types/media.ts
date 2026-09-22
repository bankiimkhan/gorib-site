export type MediaType = "movie" | "tv";

export interface Genre {
  id: number;
  name: string;
  slug: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl?: string;
  order?: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface Episode {
  id: number | string;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview: string;
  stillUrl?: string;
  airDate?: string;
  runtime?: number;
  voteAverage?: number;
}

export interface Season {
  id: number | string;
  seasonNumber: number;
  name: string;
  overview?: string;
  posterUrl?: string;
  episodeCount: number;
  airDate?: string;
  episodes?: Episode[];
}

export interface MediaItem {
  id: string; // "movie-{tmdbId}" or "tv-{tmdbId}"
  tmdbId: number;
  imdbId?: string;
  type: MediaType;
  title: string;
  originalTitle?: string;
  overview: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseDate?: string;
  year?: number;
  rating?: number;
  voteCount?: number;
  popularity?: number;
  genres: Genre[];
  runtime?: number; // in minutes
  tagline?: string;
  status?: string;
  trailerUrl?: string;
  cast?: CastMember[];
  crew?: CrewMember[];
  director?: string;
}

export interface TVShow extends MediaItem {
  type: "tv";
  totalSeasons?: number;
  totalEpisodes?: number;
  seasons?: Season[];
  lastAirDate?: string;
}

export interface MediaPageResult<T = MediaItem> {
  items: T[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface MediaFilterOptions {
  genreId?: number;
  year?: number;
  sortBy?: "popularity.desc" | "vote_average.desc" | "primary_release_date.desc";
  page?: number;
  language?: string;
  originCountry?: string;
}

