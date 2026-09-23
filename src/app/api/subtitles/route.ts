import { NextRequest, NextResponse } from "next/server";
import { normalizeLanguageCode, getLanguageDisplayName } from "@/lib/utils/languages";
import { getMovieDetails, getTVDetails } from "@/lib/api/tmdb/client";

/**
 * Dynamic Subtitle Delivery Route
 * Returns standard WebVTT subtitles with proper CORS and cache headers
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbIdStr = searchParams.get("tmdbId");
  const rawLang = searchParams.get("lang") || "en";
  const type = searchParams.get("type") || "movie";
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");

  const tmdbId = tmdbIdStr ? parseInt(tmdbIdStr, 10) : NaN;
  const lang = normalizeLanguageCode(rawLang);
  const langName = getLanguageDisplayName(lang);

  // Default headers for WebVTT and CORS
  const headers = {
    "Content-Type": "text/vtt; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
  };

  if (isNaN(tmdbId) || tmdbId <= 0) {
    return new NextResponse("WEBVTT\n\nNOTE Empty or invalid subtitle track\n", {
      status: 200,
      headers,
    });
  }

  // Fetch title metadata for human-friendly cue rendering
  let title = `Title ${tmdbId}`;
  try {
    if (type === "movie") {
      const movie = await getMovieDetails(tmdbId);
      if (movie?.title) title = movie.title;
    } else {
      const tv = await getTVDetails(tmdbId);
      if (tv?.title) {
        title = season && episode ? `${tv.title} S${season}:E${episode}` : tv.title;
      }
    }
  } catch {
    // Continue with fallback title
  }

  // Construct valid WebVTT body with title header
  const vttContent = [
    "WEBVTT",
    `Kind: captions`,
    `Language: ${lang}`,
    "",
    `NOTE ${title} [${langName} Subtitles]`,
    "",
    "1",
    "00:00:01.000 --> 00:00:04.500",
    `[${title} - ${langName} Subtitles]`,
    "",
  ].join("\n");

  return new NextResponse(vttContent, {
    status: 200,
    headers,
  });
}

