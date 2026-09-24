import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MediaCard } from "@/components/common/MediaCard";
import { MediaItem } from "@/types/media";

const sampleMovie: MediaItem = {
  id: "movie-12345",
  tmdbId: 12345,
  type: "movie",
  title: "Inception",
  overview: "A thief who steals corporate secrets through the use of dream-sharing technology...",
  posterUrl: "https://image.tmdb.org/t/p/w500/sample.jpg",
  backdropUrl: "https://image.tmdb.org/t/p/w1280/backdrop.jpg",
  year: 2010,
  rating: 8.8,
  genres: [{ id: 878, name: "Sci-Fi", slug: "sci-fi" }],
};

describe("MediaCard Component", () => {
  it("renders movie title, year, rating, and watch link", () => {
    const { getByText, getByRole } = render(<MediaCard item={sampleMovie} />);

    expect(getByText("Inception")).toBeInTheDocument();
    expect(getByText("2010")).toBeInTheDocument();
    expect(getByText("8.8")).toBeInTheDocument();

    const watchLink = getByRole("link", { name: /Play Inception/i });
    expect(watchLink).toHaveAttribute("href", "/watch/movie/12345");

    const detailLink = getByRole("link", { name: "Inception" });
    expect(detailLink).toHaveAttribute("href", "/movie/12345");
  });

  it("handles fallback graphic gracefully when posterUrl is missing", () => {
    const itemWithoutPoster: MediaItem = {
      ...sampleMovie,
      id: "movie-999",
      tmdbId: 999,
      posterUrl: undefined,
    };

    const { getAllByText } = render(<MediaCard item={itemWithoutPoster} />);
    expect(getAllByText("Inception").length).toBeGreaterThanOrEqual(1);
  });
});
