import { describe, it, expect } from "vitest";
import {
  isValidStreamUrl,
  validateStreamSource,
  validateStreamResult,
} from "@/lib/api/streaming/validator";

describe("Stream Validator Utility", () => {
  describe("isValidStreamUrl", () => {
    it("accepts valid https and http URLs", () => {
      expect(isValidStreamUrl("https://example.com/stream.m3u8")).toBe(true);
      expect(isValidStreamUrl("http://localhost:3000/stream.mp4")).toBe(true);
    });

    it("rejects malicious or invalid URLs", () => {
      expect(isValidStreamUrl("javascript:alert(1)")).toBe(false);
      expect(isValidStreamUrl("data:text/html,<script></script>")).toBe(false);
      expect(isValidStreamUrl("not-a-url")).toBe(false);
      expect(isValidStreamUrl("")).toBe(false);
      expect(isValidStreamUrl(null)).toBe(false);
    });
  });

  describe("validateStreamSource", () => {
    it("correctly identifies HLS streams", () => {
      const src = validateStreamSource({
        url: "https://cdn.example.com/playlist.m3u8",
      });
      expect(src).not.toBeNull();
      expect(src?.format).toBe("hls");
    });

    it("correctly identifies MP4 streams", () => {
      const src = validateStreamSource({
        url: "https://cdn.example.com/video.mp4",
      });
      expect(src).not.toBeNull();
      expect(src?.format).toBe("mp4");
    });

    it("discards invalid sources", () => {
      const src = validateStreamSource({
        url: "invalid-url",
      });
      expect(src).toBeNull();
    });
  });

  describe("validateStreamResult", () => {
    it("validates a complete stream result object", () => {
      const result = validateStreamResult({
        mediaId: "movie-123",
        type: "movie",
        title: "Test Movie",
        sources: [
          { url: "https://test.com/stream.m3u8", format: "hls" },
          { url: "https://test.com/stream.mp4", format: "mp4" },
        ],
        defaultSourceIndex: 0,
      });

      expect(result).not.toBeNull();
      expect(result?.sources.length).toBe(2);
      expect(result?.title).toBe("Test Movie");
    });

    it("returns null if all sources are invalid", () => {
      const result = validateStreamResult({
        mediaId: "movie-123",
        title: "Bad Movie",
        sources: [{ url: "javascript:void(0)" }],
      });

      expect(result).toBeNull();
    });
  });
});

