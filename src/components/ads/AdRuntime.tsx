"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hasUnsafeAdScriptLoaded, isPlayerRoute } from "@/lib/ads/playerRoutes";

/**
 * Site-wide ad runtime, mounted once in the root layout.
 *
 * Keeps the video player ad-free: once a non-player-safe script has run in
 *    this document, links into player routes become full page loads, so the
 *    player always mounts in a document the script never touched. Client-side
 *    history navigations into a player route (back/forward) reload for the same
 *    reason.
 */
export function AdRuntime() {
  const pathname = usePathname();
  const onPlayerRoute = isPlayerRoute(pathname);

  // A global idle injection would bypass the per-slot lazy-load, frequency, and
  // fill rules. Custom scripts are now requested by the eligible slot itself.

  // Backstop: a client-side navigation landed on a player route in a tainted document.
  useEffect(() => {
    if (onPlayerRoute && hasUnsafeAdScriptLoaded()) {
      window.location.reload();
    }
  }, [onPlayerRoute, pathname]);

  // Turn player links into hard navigations once the document is tainted.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!hasUnsafeAdScriptLoaded()) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== "_self")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || !isPlayerRoute(url.pathname)) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(url.href);
    };

    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
