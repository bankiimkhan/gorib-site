import { NextRequest, NextResponse } from "next/server";
import { getIPTVChannels } from "@/lib/api/iptv/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country") || "all";
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "48", 10);

    const result = await getIPTVChannels({
      country,
      category,
      search,
      page: isNaN(page) || page < 1 ? 1 : page,
      limit: isNaN(limit) || limit < 1 ? 48 : Math.min(limit, 100),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API IPTV Channels Error]:", error);
    return NextResponse.json(
      { error: "Unable to retrieve IPTV channels at this time." },
      { status: 500 }
    );
  }
}

