import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { StreamSource } from "@/types/streaming";

describe("VideoPlayer Language & Subtitle Switching", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const mockMultiTrackSources: StreamSource[] = [
    {
      url: "https://example.com/stream.mp4",
      format: "mp4",
      quality: "1080p",
      language: "en",
      serverName: "Server 1",
      audioTracks: [
        { id: "a1", label: "English [Original]", language: "en", default: true },
        { id: "a2", label: "Hindi [Dubbed]", language: "hi", isDub: true },
      ],
      subtitles: [
        { label: "English", language: "en", url: "/api/subtitles?tmdbId=1&lang=en", default: true },
        { label: "Bengali", language: "bn", url: "/api/subtitles?tmdbId=1&lang=bn" },
        { label: "Spanish", language: "es", url: "/api/subtitles?tmdbId=1&lang=es" },
      ],
    },
  ];

  it("renders Audio & Subtitles button and displays available language options", () => {
    render(<VideoPlayer title="Test Movie" sources={mockMultiTrackSources} />);

    const audioSubsBtn = screen.getByTitle(/Audio & Subtitles/i);
    expect(audioSubsBtn).toBeInTheDocument();

    // Open menu
    fireEvent.click(audioSubsBtn);

    // Verify Audio options
    expect(screen.getByText("English [Original]")).toBeInTheDocument();
    expect(screen.getByText("Hindi [Dubbed]")).toBeInTheDocument();

    // Verify Subtitle options
    expect(screen.getByText("Off")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Bengali")).toBeInTheDocument();
    expect(screen.getByText("Spanish")).toBeInTheDocument();
  });

  it("switches subtitle language and persists preference", async () => {
    render(<VideoPlayer title="Test Movie" sources={mockMultiTrackSources} />);

    const audioSubsBtn = screen.getByTitle(/Audio & Subtitles/i);
    fireEvent.click(audioSubsBtn);

    // Click Bengali
    const bnOption = screen.getByText("Bengali");
    fireEvent.click(bnOption);

    // Verify preference is saved in localStorage
    expect(localStorage.getItem("gorib_pref_sub_lang")).toBe("bn");
  });

  it("turns subtitles off when Off is clicked", async () => {
    render(<VideoPlayer title="Test Movie" sources={mockMultiTrackSources} />);

    const audioSubsBtn = screen.getByTitle(/Audio & Subtitles/i);
    fireEvent.click(audioSubsBtn);

    const offBtn = screen.getByText("Off");
    fireEvent.click(offBtn);

    expect(localStorage.getItem("gorib_pref_sub_lang")).toBe("off");
  });

  it("handles titles with no subtitles and single audio track gracefully", () => {
    const singleSource: StreamSource[] = [
      {
        url: "https://example.com/simple.mp4",
        format: "mp4",
        quality: "720p",
        language: "en",
        serverName: "Single Track Server",
      },
    ];

    render(<VideoPlayer title="Single Track Title" sources={singleSource} />);

    const audioSubsBtn = screen.getByTitle(/Audio & Subtitles/i);
    fireEvent.click(audioSubsBtn);

    // Should clearly show empty state for subtitles
    expect(screen.getByText(/No subtitles available for this title/i)).toBeInTheDocument();

    // Should indicate single audio stream
    expect(screen.getByText(/Single audio stream/i)).toBeInTheDocument();
  });

  it("preserves user preference when loading a new title with matching tracks", () => {
    // User already prefers Spanish subtitles
    localStorage.setItem("gorib_pref_sub_lang", "es");

    render(<VideoPlayer title="Movie 2" sources={mockMultiTrackSources} />);

    const audioSubsBtn = screen.getByTitle(/Audio & Subtitles/i);
    fireEvent.click(audioSubsBtn);
    // CC Active badge should be rendered since 'es' was matched
    expect(screen.getByText("CC Active")).toBeInTheDocument();
  });
});
