"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAdConfig, getCustomAppendToSelector, isProviderPlayerSafe } from "@/lib/ads/adConfig";
import { loadAdScript } from "@/lib/ads/scriptLoader";
import { hasUnsafeAdScriptLoaded, isPlayerRoute } from "@/lib/ads/playerRoutes";

/**
 * Site-wide ad runtime, mounted once in the root layout.
 *
 * 1. Loads the configured custom multitag on non-player routes only (idle, after
 *    first paint, so it never competes with page content).
 * 2. Keeps the video player ad-free: once a non-player-safe script has run in
 *    this document, links into player routes become full page loads, so the
 *    player always mounts in a document the script never touched. Client-side
 *    history navigations into a player route (back/forward) reload for the same
 *    reason.
 */
export function AdRuntime() {
  const pathname = usePathname();
  const onPlayerRoute = isPlayerRoute(pathname);

  // 1. Global multitag (custom provider)
  useEffect(() => {
    const config = getAdConfig();
    const scriptUrl = config.customScript?.scriptUrl;
    if (!config.enabled || config.provider !== "custom" || !scriptUrl) return;
    if (onPlayerRoute && !isProviderPlayerSafe(config)) return;

    const load = () =>
      loadAdScript(
        scriptUrl,
        { referrerPolicy: "no-referrer-when-downgrade" },
        { playerSafe: isProviderPlayerSafe(config), appendTo: getCustomAppendToSelector(config) }
      );

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(load, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(load, 1500);
    return () => window.clearTimeout(id);
  }, [onPlayerRoute]);

  // 2a. Backstop: a client-side navigation landed on a player route in a tainted document.
  useEffect(() => {
    if (onPlayerRoute && hasUnsafeAdScriptLoaded()) {
      window.location.reload();
    }
  }, [onPlayerRoute, pathname]);

  // 2b. Turn player links into hard navigations once the document is tainted.
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
