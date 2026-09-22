import { NextRequest, NextResponse } from "next/server";
import { resolveMovieStream } from "@/lib/api/streaming/resolver";
import { getMovieDetails } from "@/lib/api/tmdb/client";

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const params = await segmentData.params;
    const tmdbId = parseInt(params.id, 10);

    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { error: "Invalid TMDB movie ID provided." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    let title = searchParams.get("title");
    let year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : undefined;
    const imdbId = searchParams.get("imdb_id") || undefined;

    // If title is missing, fetch metadata from TMDB
    if (!title) {
      const movie = await getMovieDetails(tmdbId);
      if (movie) {
        title = movie.title;
        year = movie.year;
      } else {
        title = `Movie ${tmdbId}`;
      }
    }

    const streamResult = await resolveMovieStream({
      tmdbId,
      title,
      year,
      imdbId,
    });

    if (!streamResult || streamResult.sources.length === 0) {
      return NextResponse.json(
        { error: "No playable stream sources found for this movie." },
        { status: 404 }
      );
    }

    return NextResponse.json(streamResult);
  } catch (error) {
    console.error("[API Stream Movie Error]:", error);
    return NextResponse.json(
      { error: "Unable to resolve stream source at this time. Please try again later." },
      { status: 500 }
    );
  }
}

