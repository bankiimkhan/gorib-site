import { isCurrentPlayerRoute, markUnsafeAdScriptLoaded } from "./playerRoutes";

/**
 * Safe client-side script loader with deduplication and error handling.
 */
const loadedScripts = new Set<string>();
/** Scripts that failed (ad blocker, network): later slots resolve immediately instead of re-injecting. */
const failedScripts = new Set<string>();
const pendingPromises = new Map<string, Promise<boolean>>();

interface LoadAdScriptOptions {
  /**
   * Scripts that are not player-safe are never injected while a player route
   * is open, and loading one flags the document so later client-side
   * navigations into a player route become full page loads.
   */
  playerSafe?: boolean;
  /** Passed to multitag scripts as `script.settings.appendTo`. */
  appendTo?: string;
}

export function loadAdScript(
  src: string,
  attributes: Record<string, string> = {},
  options: LoadAdScriptOptions = {}
): Promise<boolean> {
  if (typeof window === "undefined" || !src) {
    return Promise.resolve(false);
  }

  const playerSafe = options.playerSafe ?? false;
  if (!playerSafe && isCurrentPlayerRoute()) {
    return Promise.resolve(false);
  }

  if (loadedScripts.has(src)) {
    return Promise.resolve(true);
  }

  if (failedScripts.has(src)) {
    return Promise.resolve(false);
  }

  if (pendingPromises.has(src)) {
    return pendingPromises.get(src)!;
  }

  // Check if script element already exists in DOM
  const normalizedSrc = src.replace(/^\/\//, "");
  const existing =
    document.querySelector(`script[src="${src}"]`) ||
    Array.from(document.querySelectorAll("script")).find(
      (s) => s.src === src || s.src.includes(normalizedSrc)
    );
  if (existing) {
    loadedScripts.add(src);
    return Promise.resolve(true);
  }

  const promise = new Promise<boolean>((resolve) => {
    try {
      const script = document.createElement("script");
      if (options.appendTo) {
        (script as unknown as { settings?: Record<string, unknown> }).settings = {
          appendTo: options.appendTo,
        };
      }
      script.src = src;
      script.async = true;
      if (attributes.crossOrigin) {
        script.crossOrigin = attributes.crossOrigin;
      }
      if (attributes.referrerPolicy) {
        script.referrerPolicy = attributes.referrerPolicy;
      }

      Object.entries(attributes).forEach(([key, val]) => {
        if (key !== "crossOrigin" && key !== "referrerPolicy") {
          script.setAttribute(key, val);
        }
      });

      script.onload = () => {
        loadedScripts.add(src);
        pendingPromises.delete(src);
        resolve(true);
      };

      script.onerror = () => {
        pendingPromises.delete(src);
        failedScripts.add(src);
        script.remove();
        // Script blocked or network error
        resolve(false);
      };

      if (!playerSafe) {
        markUnsafeAdScriptLoaded();
      }
      document.head.appendChild(script);
    } catch {
      pendingPromises.delete(src);
      resolve(false);
    }
  });

  pendingPromises.set(src, promise);
  return promise;
}
