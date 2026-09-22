import { NextRequest, NextResponse } from "next/server";
import { resolveEpisodeStream } from "@/lib/api/streaming/resolver";
import { getTVDetails } from "@/lib/api/tmdb/client";

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params;
    const tmdbId = parseInt(params.id, 10);

    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { error: "Invalid TMDB TV ID provided." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const season = parseInt(searchParams.get("season") || "1", 10);
    const episode = parseInt(searchParams.get("episode") || "1", 10);

    if (isNaN(season) || season < 1 || isNaN(episode) || episode < 1) {
      return NextResponse.json(
        { error: "Invalid season or episode number provided." },
        { status: 400 }
      );
    }

    let title = searchParams.get("title");
    const imdbId = searchParams.get("imdb_id") || undefined;

    if (!title) {
      const tvShow = await getTVDetails(tmdbId);
      title = tvShow ? tvShow.title : `TV Show ${tmdbId}`;
    }

    const streamResult = await resolveEpisodeStream({
      tmdbId,
      season,
      episode,
      title,
      imdbId,
    });

    if (!streamResult || streamResult.sources.length === 0) {
      return NextResponse.json(
        { error: `No stream sources found for Season ${season} Episode ${episode}.` },
        { status: 404 }
      );
    }

    return NextResponse.json(streamResult);
  } catch (error) {
    console.error("[API Stream TV Error]:", error);
    return NextResponse.json(
      { error: "Unable to resolve TV stream source at this time. Please try again later." },
      { status: 500 }
    );
  }
}

