import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory sliding window for active visitor sessions
// Maps sessionId -> last active timestamp (ms)
const activeSessions = new Map<string, number>();
const SESSION_TIMEOUT_MS = 35_000; // 35 seconds inactivity window

export function cleanupAndCount(): number {
  const now = Date.now();
  for (const [id, timestamp] of activeSessions.entries()) {
    if (now - timestamp > SESSION_TIMEOUT_MS) {
      activeSessions.delete(id);
    }
  }
  return activeSessions.size;
}

export function resetActiveSessions(): void {
  activeSessions.clear();
}

export async function GET() {
  const count = cleanupAndCount();
  return NextResponse.json(
    { count: Math.max(1, count) },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, action } = (body || {}) as { sessionId?: string; action?: string };
    const now = Date.now();

    if (sessionId && typeof sessionId === "string") {
      if (action === "leave") {
        activeSessions.delete(sessionId);
      } else {
        activeSessions.set(sessionId, now);
      }
    }

    const count = cleanupAndCount();
    return NextResponse.json(
      { count: Math.max(1, count) },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch {
    return NextResponse.json({ count: 1 });
  }
}

