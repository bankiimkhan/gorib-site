import { describe, it, expect } from "vitest";
import { validateStreamSource, validateStreamResult } from "@/lib/api/streaming/validator";

describe("Validator Language & Subtitle Sanitization", () => {
  it("sanitizes and deduplicates subtitle tracks on a stream source", () => {
    const rawSource = {
      url: "https://example.com/video.mp4",
      format: "mp4",
      language: "eng",
      subtitles: [
        { label: "English", language: "eng", url: "https://example.com/en.vtt", default: true },
        { label: "English", language: "en", url: "https://example.com/en.vtt" }, // duplicate url
        { label: "Bengali", language: "ben", url: "https://example.com/bn.vtt" },
        { label: "Broken", language: "es", url: "javascript:alert(1)" }, // invalid URL protocol
      ],
    };

    const validated = validateStreamSource(rawSource);
    expect(validated).not.toBeNull();
    expect(validated?.language).toBe("en");
    expect(validated?.subtitles).toHaveLength(2);
    expect(validated?.subtitles?.[0].language).toBe("en");
    expect(validated?.subtitles?.[0].label).toBe("English");
    expect(validated?.subtitles?.[0].default).toBe(true);
    expect(validated?.subtitles?.[1].language).toBe("bn");
    expect(validated?.subtitles?.[1].label).toBe("Bengali");
  });

  it("sanitizes and deduplicates audio tracks on a stream source", () => {
    const rawSource = {
      url: "https://example.com/video.mp4",
      format: "mp4",
      language: "hin",
      audioTracks: [
        { id: 1, label: "Hindi", language: "hin", default: true },
        { id: 2, label: "Hindi", language: "hi" }, // duplicate
        { id: 3, label: "English Dub", language: "eng", isDub: true },
      ],
    };

    const validated = validateStreamSource(rawSource);
    expect(validated).not.toBeNull();
    expect(validated?.audioTracks).toHaveLength(2);
    expect(validated?.audioTracks?.[0].language).toBe("hi");
    expect(validated?.audioTracks?.[0].default).toBe(true);
    expect(validated?.audioTracks?.[1].language).toBe("en");
    expect(validated?.audioTracks?.[1].isDub).toBe(true);
  });

  it("sanitizes availableSubtitles and availableAudio on StreamResult", () => {
    const rawResult = {
      mediaId: "movie-100",
      title: "Sample Movie",
      type: "movie",
      sources: [
        {
          url: "https://example.com/video.mp4",
          format: "mp4",
        },
      ],
      availableSubtitles: [
        { label: "English", language: "en", url: "https://example.com/sub.vtt" },
      ],
      availableAudio: [
        { id: "a1", label: "English [Original]", language: "en" },
      ],
    };

    const validated = validateStreamResult(rawResult);
    expect(validated).not.toBeNull();
    expect(validated?.availableSubtitles).toHaveLength(1);
    expect(validated?.availableAudio).toHaveLength(1);
  });
});

