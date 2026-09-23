import { describe, it, expect } from "vitest";
import {
  normalizeLanguageCode,
  getLanguageDisplayName,
  formatSubtitleLabel,
  formatAudioLabel,
  deduplicateSubtitleTracks,
  deduplicateAudioTracks,
} from "@/lib/utils/languages";
import { SubtitleTrack, AudioTrack } from "@/types/streaming";

describe("Language Utilities", () => {
  describe("normalizeLanguageCode", () => {
    it("handles standard 2-letter codes", () => {
      expect(normalizeLanguageCode("en")).toBe("en");
      expect(normalizeLanguageCode("bn")).toBe("bn");
      expect(normalizeLanguageCode("hi")).toBe("hi");
    });

    it("normalizes 3-letter ISO-639-2 codes to 2-letter codes", () => {
      expect(normalizeLanguageCode("eng")).toBe("en");
      expect(normalizeLanguageCode("ben")).toBe("bn");
      expect(normalizeLanguageCode("hin")).toBe("hi");
      expect(normalizeLanguageCode("spa")).toBe("es");
      expect(normalizeLanguageCode("fra")).toBe("fr");
      expect(normalizeLanguageCode("kor")).toBe("ko");
      expect(normalizeLanguageCode("jpn")).toBe("ja");
    });

    it("normalizes locale codes with subtags and whitespace", () => {
      expect(normalizeLanguageCode("en-US")).toBe("en");
      expect(normalizeLanguageCode("  bn_BD  ")).toBe("bn");
      expect(normalizeLanguageCode("es-419")).toBe("es");
    });

    it("handles edge cases and invalid inputs", () => {
      expect(normalizeLanguageCode(null)).toBe("und");
      expect(normalizeLanguageCode(undefined)).toBe("und");
      expect(normalizeLanguageCode("")).toBe("und");
      expect(normalizeLanguageCode("   ")).toBe("und");
      expect(normalizeLanguageCode("unknown")).toBe("unknown");
    });
  });

  describe("getLanguageDisplayName", () => {
    it("returns correct display names for valid codes", () => {
      expect(getLanguageDisplayName("en")).toBe("English");
      expect(getLanguageDisplayName("bn")).toBe("Bengali");
      expect(getLanguageDisplayName("hi")).toBe("Hindi");
      expect(getLanguageDisplayName("es")).toBe("Spanish");
      expect(getLanguageDisplayName("ko")).toBe("Korean");
      expect(getLanguageDisplayName("ja")).toBe("Japanese");
    });

    it("handles 3-letter codes and locale subtags", () => {
      expect(getLanguageDisplayName("eng")).toBe("English");
      expect(getLanguageDisplayName("en-US")).toBe("English");
      expect(getLanguageDisplayName("hin")).toBe("Hindi");
    });

    it("falls back gracefully for unknown codes or missing inputs", () => {
      expect(getLanguageDisplayName("xyz", "Custom Fallback")).toBe("Custom Fallback");
      expect(getLanguageDisplayName(null, "No Language")).toBe("No Language");
      expect(getLanguageDisplayName("xyz")).toBe("XYZ");
    });
  });

  describe("formatSubtitleLabel", () => {
    it("formats generic labels with display names", () => {
      expect(formatSubtitleLabel({ label: "Subtitle", language: "en" })).toBe("English");
      expect(formatSubtitleLabel({ label: "Track 1", language: "bn" })).toBe("Bengali");
      expect(formatSubtitleLabel({ label: "", language: "hi" })).toBe("Hindi");
      expect(formatSubtitleLabel({ label: "und", language: "es" })).toBe("Spanish");
    });

    it("preserves informative labels", () => {
      expect(formatSubtitleLabel({ label: "English [CC]", language: "en" })).toBe("English [CC]");
      expect(formatSubtitleLabel({ label: "Spanish (Latin America)", language: "es" })).toBe(
        "Spanish (Latin America)"
      );
    });

    it("combines unmentioned informative labels with language name", () => {
      expect(formatSubtitleLabel({ label: "Commentary", language: "en" })).toBe(
        "English (Commentary)"
      );
    });
  });

  describe("formatAudioLabel", () => {
    it("marks original audio track", () => {
      expect(formatAudioLabel({ language: "en", isOriginal: true })).toBe("English [Original]");
    });

    it("marks dubbed audio track", () => {
      expect(formatAudioLabel({ language: "hi", isDub: true })).toBe("Hindi [Dubbed]");
    });

    it("formats generic audio label", () => {
      expect(formatAudioLabel({ language: "bn" })).toBe("Bengali");
    });
  });

  describe("deduplicateSubtitleTracks", () => {
    it("removes invalid, null, and duplicate tracks", () => {
      const input: SubtitleTrack[] = [
        { label: "English", language: "en", url: "https://example.com/en.vtt", default: true },
        { label: "English", language: "eng", url: "https://example.com/en.vtt" }, // duplicate url
        { label: "English", language: "en", url: "https://example.com/en-dup.vtt" }, // duplicate lang/label
        { label: "Bengali", language: "bn", url: "https://example.com/bn.vtt" },
        { label: "Empty URL", language: "es", url: "   " }, // invalid
      ];

      const result = deduplicateSubtitleTracks(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: "English",
        language: "en",
        url: "https://example.com/en.vtt",
        default: true,
      });
      expect(result[1]).toEqual({
        label: "Bengali",
        language: "bn",
        url: "https://example.com/bn.vtt",
      });
    });

    it("ensures at most one track is default", () => {
      const input: SubtitleTrack[] = [
        { label: "English", language: "en", url: "https://example.com/en.vtt", default: true },
        { label: "Spanish", language: "es", url: "https://example.com/es.vtt", default: true },
      ];

      const result = deduplicateSubtitleTracks(input);
      expect(result[0].default).toBe(true);
      expect(result[1].default).toBeUndefined();
    });

    it("returns empty array on empty or null input", () => {
      expect(deduplicateSubtitleTracks(null)).toEqual([]);
      expect(deduplicateSubtitleTracks([])).toEqual([]);
    });
  });

  describe("deduplicateAudioTracks", () => {
    it("removes duplicate audio tracks and normalizes labels", () => {
      const input: AudioTrack[] = [
        { id: 1, label: "English", language: "eng", default: true },
        { id: 2, label: "English", language: "en" }, // duplicate
        { id: 3, label: "Hindi", language: "hin", isDub: true },
      ];

      const result = deduplicateAudioTracks(input);
      expect(result).toHaveLength(2);
      expect(result[0].language).toBe("en");
      expect(result[0].label).toBe("English");
      expect(result[0].default).toBe(true);
      expect(result[1].language).toBe("hi");
      expect(result[1].label).toBe("Hindi [Dubbed]");
    });
  });
});

