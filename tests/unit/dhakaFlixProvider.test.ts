import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cleanTitle,
  scoreFolderMatch,
  extractDirectoryLinks,
  resolveDhakaFlixMovie,
  resolveDhakaFlixEpisode,
} from "@/lib/api/streaming/dhakaFlixProvider";

describe("dhakaFlixProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("cleanTitle", () => {
    it("normalizes punctuation, symbols, and whitespace", () => {
      expect(cleanTitle("Dune: Part Two")).toBe("dune part two");
      expect(cleanTitle("A Bug's Life (1998)")).toBe("a bug s life 1998");
      expect(cleanTitle("Mission: Impossible - Dead Reckoning")).toBe("mission impossible dead reckoning");
    });

    it("handles short titles correctly", () => {
      expect(cleanTitle("Up")).toBe("up");
      expect(cleanTitle("PK")).toBe("pk");
      expect(cleanTitle("300")).toBe("300");
    });
  });

  describe("scoreFolderMatch", () => {
    it("gives 120 points for exact title and year match", () => {
      const score = scoreFolderMatch("12th Fail (2023) 1080p", "12th Fail", 2023);
      expect(score).toBe(120);
    });

    it("strips index numbers like 001. from folder names", () => {
      const score = scoreFolderMatch(
        "001. The Shawshank Redemption (1994) 1080p [Dual Audio]",
        "The Shawshank Redemption",
        1994
      );
      expect(score).toBe(120);
    });

    it("matches Roman numerals flexibly", () => {
      const score = scoreFolderMatch(
        "Dune-Part Two (2024) 1080p [Dual Audio]",
        "Dune: Part II",
        2024
      );
      expect(score).toBeGreaterThanOrEqual(100);
    });

    it("matches regional cinema folder titles accurately", () => {
      expect(scoreFolderMatch("Salaar (2023) 1080p [Dual Audio]", "Salaar", 2023)).toBe(120);
      expect(scoreFolderMatch("Biye Bibhrat (2023) 720p", "Biye Bibhrat", 2023)).toBe(120);
      expect(scoreFolderMatch("Dasham Avatar (2023) 1080p", "Dasham Avatar", 2023)).toBe(120);
    });

    it("differentiates between Avatar and Dasham Avatar", () => {
      const avatarScore = scoreFolderMatch("Avatar (2009) 1080p", "Avatar", 2009);
      const dashamScore = scoreFolderMatch("Dasham Avatar (2023) 1080p", "Avatar", 2009);
      expect(avatarScore).toBeGreaterThan(dashamScore);
    });
  });

  describe("extractDirectoryLinks", () => {
    it("extracts valid hrefs and ignores parent directory and browsehappy", () => {
      const mockHtml = `
        <table>
          <tr><td><a href="..">Parent Directory</a></td></tr>
          <tr><td><a href="http://browsehappy.com">Browse Happy</a></td></tr>
          <tr><td><a href="/DHAKA-FLIX-14/Hindi%20Movies/(2023)/12th%20Fail/">12th Fail (2023) 1080p</a></td></tr>
          <tr><td><a href="/DHAKA-FLIX-14/Hindi%20Movies/(2023)/Jawan/">Jawan (2023) 1080p</a></td></tr>
        </table>
      `;
      const links = extractDirectoryLinks(mockHtml);
      expect(links).toHaveLength(2);
      expect(links[0].name).toBe("12th Fail (2023) 1080p");
      expect(links[1].name).toBe("Jawan (2023) 1080p");
    });
  });

  describe("resolveDhakaFlixMovie", () => {
    it("resolves a movie stream when folders and files match", async () => {
      vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("Hindi%20Movies/%282023%29/")) {
          return new Response(
            `<a href="/DHAKA-FLIX-14/Hindi%20Movies/(2023)/12th%20Fail/">12th Fail (2023) 1080p</a>`,
            { status: 200 }
          );
        }
        if (urlStr.includes("12th%20Fail")) {
          return new Response(
            `<a href="12th.Fail.2023.1080p.mkv">12th.Fail.2023.1080p.mkv</a>
             <a href="12th.Fail.2023.Bangla.srt">12th.Fail.2023.Bangla.srt</a>`,
            { status: 200 }
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const result = await resolveDhakaFlixMovie("12th Fail", 2023);
      expect(result).toBeDefined();
      expect(result?.url).toContain("12th");
      expect(result?.quality).toBe("1080p");
      expect(result?.serverName).toContain("DhakaFlix");
      expect(result?.language).toBe("hi");
    });

    it("returns null gracefully if network or directory is unreachable", async () => {
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));
      const result = await resolveDhakaFlixMovie("Nonexistent Movie", 2024);
      expect(result).toBeNull();
    });
  });

  describe("resolveDhakaFlixEpisode", () => {
    it("resolves TV episode with customized season folders (e.g. Hindi Dubbed)", async () => {
      vi.spyOn(global, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("TV%20Series%20%E2%99%A5%20%20A%20%20%E2%80%94%20%20L")) {
          return new Response(
            `<a href="/DHAKA-FLIX-12/TV-WEB-Series/A%20Love%20So%20Beautiful/">A Love So Beautiful (TV Series 2017) 720p</a>`,
            { status: 200 }
          );
        }
        if (urlStr.includes("A%20Love%20So%20Beautiful/") && !urlStr.includes("Season")) {
          return new Response(
            `<a href="Season%201%20(Hindi%20Dubbed)/">Season 1 (Hindi Dubbed)</a>`,
            { status: 200 }
          );
        }
        if (urlStr.includes("Season%201%20(Hindi%20Dubbed)/")) {
          return new Response(
            `<a href="A.Love.So.Beautiful.S01E02.mkv">A Love So Beautiful S01E02 Hindi Dubbed.mkv</a>`,
            { status: 200 }
          );
        }
        return new Response("Not Found", { status: 404 });
      });

      const result = await resolveDhakaFlixEpisode("A Love So Beautiful", 1, 2);
      expect(result).toBeDefined();
      expect(result?.url).toContain("A.Love.So.Beautiful.S01E02.mkv");
      expect(result?.language).toBe("hi");
      expect(result?.serverName).toContain("DhakaFlix");
    });
  });
});

