import { describe, it, expect } from "vitest";
import {
  normalizeMovie,
  normalizeMovieDetails,
  normalizeSeasonDetails,
} from "@/lib/api/tmdb/normalizer";
import { TMDBMovie, TMDBMovieDetails, TMDBSeasonDetails } from "@/types/tmdb";

describe("TMDB Normalizer", () => {
  it("normalizes a raw TMDB movie accurately", () => {
    const raw: TMDBMovie = {
      id: 550,
      title: "Fight Club",
      original_title: "Fight Club",
      overview: "An insomniac office worker...",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      backdrop_path: "/rr7E0NoGKxvbkb89eR2GwfoYjpA.jpg",
      release_date: "1999-10-15",
      vote_average: 8.433,
      vote_count: 26000,
      popularity: 63.8,
      adult: false,
      genre_ids: [18], // Drama
    };

    const normalized = normalizeMovie(raw);
    expect(normalized.id).toBe("movie-550");
    expect(normalized.tmdbId).toBe(550);
    expect(normalized.title).toBe("Fight Club");
    expect(normalized.year).toBe(1999);
    expect(normalized.genres[0]?.name).toBe("Drama");
    expect(normalized.posterUrl).toContain("/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg");
  });

  it("handles missing or null poster, backdrop, and date gracefully", () => {
    const raw: TMDBMovie = {
      id: 999,
      title: "Unknown Movie",
      original_title: "Unknown",
      overview: "",
      poster_path: null,
      backdrop_path: null,
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      adult: false,
    };

    const normalized = normalizeMovie(raw);
    expect(normalized.posterUrl).toBeUndefined();
    expect(normalized.backdropUrl).toBeUndefined();
    expect(normalized.year).toBeUndefined();
    expect(normalized.overview).toBe("No overview available.");
  });

  it("extracts director, cast, and trailer in normalizeMovieDetails", () => {
    const raw: TMDBMovieDetails = {
      id: 157336,
      title: "Interstellar",
      original_title: "Interstellar",
      overview: "A team of explorers travel through a wormhole...",
      poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      backdrop_path: "/rAiYTsqLi0t04QwpZqoP0v8D9Um.jpg",
      release_date: "2014-11-05",
      vote_average: 8.4,
      vote_count: 34000,
      popularity: 140,
      adult: false,
      genres: [{ id: 878, name: "Science Fiction" }],
      runtime: 169,
      tagline: "Mankind was born on Earth. It was never meant to die here.",
      status: "Released",
      imdb_id: "tt0816692",
      credits: {
        cast: [
          {
            id: 10297,
            name: "Matthew McConaughey",
            character: "Cooper",
            profile_path: "/sY2wa52GzNmhu09whuoDrKioqYp.jpg",
            order: 0,
          },
        ],
        crew: [
          {
            id: 525,
            name: "Christopher Nolan",
            job: "Director",
            department: "Directing",
          },
        ],
      },
      videos: {
        results: [
          {
            id: "1",
            key: "zSWdZVtXT7E",
            name: "Official Trailer",
            site: "YouTube",
            type: "Trailer",
            official: true,
          },
        ],
      },
    };

    const normalized = normalizeMovieDetails(raw);
    expect(normalized.director).toBe("Christopher Nolan");
    expect(normalized.cast?.[0]?.name).toBe("Matthew McConaughey");
    expect(normalized.trailerUrl).toBe("https://www.youtube.com/watch?v=zSWdZVtXT7E");
    expect(normalized.imdbId).toBe("tt0816692");
    expect(normalized.runtime).toBe(169);
  });

  it("normalizes season and episode lists accurately", () => {
    const rawSeason: TMDBSeasonDetails = {
      id: 300,
      season_number: 1,
      name: "Season 1",
      overview: "The beginning",
      poster_path: null,
      air_date: "2020-01-01",
      episodes: [
        {
          id: 1001,
          episode_number: 1,
          season_number: 1,
          name: "Pilot",
          overview: "Pilot episode",
          still_path: "/still1.jpg",
          air_date: "2020-01-01",
          runtime: 58,
          vote_average: 8.2,
        },
      ],
    };

    const normalized = normalizeSeasonDetails(rawSeason);
    expect(normalized.seasonNumber).toBe(1);
    expect(normalized.episodes?.length).toBe(1);
    expect(normalized.episodes?.[0]?.title).toBe("Pilot");
    expect(normalized.episodes?.[0]?.runtime).toBe(58);
  });
});

