/**
 * Safe client-side script loader with deduplication and error handling.
 */
const loadedScripts = new Set<string>();
const pendingPromises = new Map<string, Promise<boolean>>();

export function loadAdScript(src: string, attributes: Record<string, string> = {}): Promise<boolean> {
  if (typeof window === "undefined" || !src) {
    return Promise.resolve(false);
  }

  if (loadedScripts.has(src)) {
    return Promise.resolve(true);
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
      const appendSelector =
        attributes.appendTo ||
        '[data-custom-placement="home-top"], [data-custom-placement="player-bottom"], [data-custom-placement="details-mid"], [data-custom-placement="home-feed"]';
      (script as unknown as { settings?: Record<string, unknown> }).settings = {
        appendTo: appendSelector,
      };
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
        // Script blocked or network error
        resolve(false);
      };

      document.head.appendChild(script);
    } catch {
      pendingPromises.delete(src);
      resolve(false);
    }
  });

  pendingPromises.set(src, promise);
  return promise;
}

