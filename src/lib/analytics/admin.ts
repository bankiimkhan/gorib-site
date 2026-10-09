export const ANALYTICS_SESSION_COOKIE = "gorib_analytics_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** True only when the deployment has been explicitly configured for an owner. */
export function isAnalyticsAccessConfigured(): boolean {
  return Boolean(process.env.ANALYTICS_ADMIN_TOKEN);
}

/**
 * Verify an owner token without exposing it to the browser bundle. The cookie
 * carries the same opaque token after the login route has validated it.
 */
export async function hasAnalyticsAccess(candidate?: string): Promise<boolean> {
  const expected = process.env.ANALYTICS_ADMIN_TOKEN;
  if (!expected || !candidate) return false;

  const encoder = new TextEncoder();
  const [expectedHash, candidateHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
  ]);
  const expectedBytes = new Uint8Array(expectedHash);
  const candidateBytes = new Uint8Array(candidateHash);
  let difference = expected.length ^ candidate.length;
  for (let index = 0; index < expectedBytes.length; index++) {
    difference |= expectedBytes[index] ^ candidateBytes[index];
  }
  return difference === 0;
}

export const analyticsSessionCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
