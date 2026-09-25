import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Malformed URL" }, { status: 400 });
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: `${parsedUrl.protocol}//${parsedUrl.host}`,
      },
    });

    if (!response.ok) {
      return new NextResponse(`Remote server returned ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";

    // If it's an M3U8 playlist, route every URI it references back through this proxy.
    // Otherwise variant playlists, segments and keys load straight from the origin and hit
    // the same CORS / mixed-content failures the proxy exists to avoid.
    if (
      contentType.includes("mpegurl") ||
      contentType.includes("m3u") ||
      /\.m3u8?$/i.test(parsedUrl.pathname)
    ) {
      const playlistText = await response.text();
      // Resolve against the final URL: many streams redirect to a CDN host.
      const baseUrl = response.url || targetUrl;
      const proxify = (uri: string) => {
        try {
          return `/api/iptv/proxy?url=${encodeURIComponent(new URL(uri, baseUrl).toString())}`;
        } catch {
          return uri;
        }
      };

      const rewrittenLines = playlistText.split(/\r?\n/).map((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return line;
        }
        // Tags such as #EXT-X-KEY, #EXT-X-MEDIA and #EXT-X-MAP carry URIs in attributes.
        if (trimmed.startsWith("#")) {
          return line.replace(/URI="([^"]+)"/g, (_, uri: string) => `URI="${proxify(uri)}"`);
        }
        return proxify(trimmed);
      });

      const rewrittenPlaylist = rewrittenLines.join("\n");

      return new NextResponse(rewrittenPlaylist, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // For other media segments / files, stream directly
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (error) {
    console.error("[IPTV Proxy Error]:", error);
    return NextResponse.json(
      { error: "Failed to proxy stream resource" },
      { status: 502 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

