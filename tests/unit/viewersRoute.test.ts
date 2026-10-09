import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST, resetActiveSessions } from "@/app/api/viewers/route";
import { NextRequest } from "next/server";

const ANALYTICS_TOKEN = "test-owner-token-viewers";

function ownerRequest() {
  return new NextRequest("http://localhost:3000/api/viewers", {
    headers: { cookie: `gorib_analytics_session=${ANALYTICS_TOKEN}` },
  });
}

describe("Real-time Viewers API (/api/viewers)", () => {
  beforeEach(() => {
    resetActiveSessions();
    process.env.ANALYTICS_ADMIN_TOKEN = ANALYTICS_TOKEN;
  });

  it("returns count of 1 to the owner when no prior sessions exist", async () => {
    const res = await GET(ownerRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.count).toBe(1);
  });

  it("registers a new session via POST without exposing count", async () => {
    const req = new NextRequest("http://localhost:3000/api/viewers", {
      method: "POST",
      body: JSON.stringify({ sessionId: "user-1", action: "ping" }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("increments count when multiple distinct sessions ping ('if 2 then 2')", async () => {
    const req1 = new NextRequest("http://localhost:3000/api/viewers", {
      method: "POST",
      body: JSON.stringify({ sessionId: "user-1", action: "ping" }),
    });
    const req2 = new NextRequest("http://localhost:3000/api/viewers", {
      method: "POST",
      body: JSON.stringify({ sessionId: "user-2", action: "ping" }),
    });

    await POST(req1);
    const res2 = await POST(req2);
    const data2 = await res2.json();

    expect(data2.success).toBe(true);
    expect((await (await GET(ownerRequest())).json()).count).toBe(2);
  });

  it("decrements count when a session leaves ('if 1 then 1')", async () => {
    const req1 = new NextRequest("http://localhost:3000/api/viewers", {
      method: "POST",
      body: JSON.stringify({ sessionId: "user-1", action: "ping" }),
    });
    const req2 = new NextRequest("http://localhost:3000/api/viewers", {
      method: "POST",
      body: JSON.stringify({ sessionId: "user-2", action: "ping" }),
    });

    await POST(req1);
    await POST(req2);

    // user-2 leaves
    const reqLeave = new NextRequest("http://localhost:3000/api/viewers", {
      method: "POST",
      body: JSON.stringify({ sessionId: "user-2", action: "leave" }),
    });
    const resLeave = await POST(reqLeave);
    const dataLeave = await resLeave.json();

    expect(dataLeave.success).toBe(true);
    expect((await (await GET(ownerRequest())).json()).count).toBe(1);
  });

  it("counts each visitor once in the all-time total", async () => {
    const ping = (sessionId: string, visitorId: string) =>
      POST(
        new NextRequest("http://localhost:3000/api/viewers", {
          method: "POST",
          body: JSON.stringify({ sessionId, visitorId, action: "ping" }),
        })
      );

    await ping("tab-1", "visitor-aaaa");
    await ping("tab-2", "visitor-aaaa");
    await ping("tab-3", "visitor-bbbb");
    const data = await (await GET(ownerRequest())).json();

    expect(data.total).toBe(2);
  });

  it("keeps the all-time total after visitors leave", async () => {
    await POST(
      new NextRequest("http://localhost:3000/api/viewers", {
        method: "POST",
        body: JSON.stringify({ sessionId: "tab-1", visitorId: "visitor-aaaa", action: "ping" }),
      })
    );
    await POST(
      new NextRequest("http://localhost:3000/api/viewers", {
        method: "POST",
        body: JSON.stringify({ sessionId: "tab-1", action: "leave" }),
      })
    );

    const data = await (await GET(ownerRequest())).json();
    expect(data.total).toBe(1);
  });

  it("sets no-cache headers to ensure live edge delivery", async () => {
    const res = await GET(ownerRequest());
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("hides counts from visitors without owner access", async () => {
    const res = await GET(new NextRequest("http://localhost:3000/api/viewers"));
    expect(res.status).toBe(404);
  });
});

