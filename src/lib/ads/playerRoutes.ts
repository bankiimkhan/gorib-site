/**
 * Player-route ad isolation.
 *
 * Routes that mount a video player must stay completely ad-free inside and over
 * the playback area. Some programmatic "multitag" scripts bundle popunders and
 * invisible click-capture overlays that they lay over every iframe on the page,
 * which would hijack player interaction. Such scripts are never loaded on player
 * routes, and once one has been loaded into a document, navigations to a player
 * route are forced to be full page loads so the player always starts in a clean
 * document.
 */

const PLAYER_ROUTE_PREFIXES = ["/watch", "/live-tv"];

/** Window flag set once a non-player-safe ad script has executed in this document. */
export const UNSAFE_AD_SCRIPT_FLAG = "__goribUnsafeAdScriptLoaded";

export function isPlayerRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PLAYER_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isCurrentPlayerRoute(): boolean {
  if (typeof window === "undefined") return false;
  return isPlayerRoute(window.location.pathname);
}

export function markUnsafeAdScriptLoaded() {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, boolean>)[UNSAFE_AD_SCRIPT_FLAG] = true;
}

export function hasUnsafeAdScriptLoaded(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as Record<string, boolean>)[UNSAFE_AD_SCRIPT_FLAG]);
}
