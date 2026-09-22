import { describe, it, expect } from "vitest";
import {
  formatRuntime,
  formatRating,
  formatYear,
  formatPlayerTime,
  formatCompactNumber,
} from "@/lib/utils/formatters";

describe("Formatters Utility", () => {
  it("formats runtime into hours and minutes", () => {
    expect(formatRuntime(124)).toBe("2h 4m");
    expect(formatRuntime(60)).toBe("1h");
    expect(formatRuntime(45)).toBe("45m");
    expect(formatRuntime(0)).toBe("N/A");
    expect(formatRuntime(null)).toBe("N/A");
  });

  it("formats rating to 1 decimal place", () => {
    expect(formatRating(8.256)).toBe("8.3");
    expect(formatRating(7.0)).toBe("7.0");
    expect(formatRating(0)).toBe("NR");
    expect(formatRating(null)).toBe("NR");
  });

  it("extracts 4-digit release year", () => {
    expect(formatYear("2024-03-01")).toBe(2024);
    expect(formatYear("1999-12-31")).toBe(1999);
    expect(formatYear("")).toBeUndefined();
    expect(formatYear(null)).toBeUndefined();
  });

  it("formats player time in MM:SS and HH:MM:SS", () => {
    expect(formatPlayerTime(0)).toBe("00:00");
    expect(formatPlayerTime(75)).toBe("01:15");
    expect(formatPlayerTime(3665)).toBe("01:01:05");
    expect(formatPlayerTime(Infinity)).toBe("00:00");
  });

  it("formats compact numbers", () => {
    expect(formatCompactNumber(1500)).toBe("1.5K");
    expect(formatCompactNumber(2500000)).toBe("2.5M");
  });
});

