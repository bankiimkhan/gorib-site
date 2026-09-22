import { NextRequest, NextResponse } from "next/server";
import { searchMedia } from "@/lib/api/tmdb/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const typeParam = searchParams.get("type") as "movie" | "tv" | "multi" | null;
    const type = typeParam === "movie" || typeParam === "tv" ? typeParam : "multi";
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

    if (!query.trim()) {
      return NextResponse.json({
        items: [],
        page: 1,
        totalPages: 0,
        totalResults: 0,
      });
    }

    const result = await searchMedia(query.trim(), page, type);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[API Search Error]:", error);
    return NextResponse.json(
      { error: "Failed to execute search. Please try again." },
      { status: 500 }
    );
  }
}

