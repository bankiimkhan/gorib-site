"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { Logo } from "./Logo";

const FOOTER_COLUMNS = [
  {
    title: "Browse",
    links: [
      { label: "Home", href: "/" },
      { label: "Movies", href: "/movies" },
      { label: "TV Shows", href: "/tv" },
      { label: "New & Popular", href: "/trending" },
      { label: "Live TV", href: "/live-tv" },
      { label: "My List", href: "/watchlist" },
    ],
  },
  {
    title: "Regional",
    links: [
      { label: "Bangla Cinema", href: "/movies?language=bn" },
      { label: "Bollywood", href: "/movies?language=hi" },
      { label: "South Indian", href: "/movies?language=south" },
      { label: "K-Drama", href: "/tv?language=ko&genre=18" },
      { label: "Anime", href: "/tv?language=ja&genre=16" },
    ],
  },
  {
    title: "Genres",
    links: [
      { label: "Action", href: "/genre/action" },
      { label: "Comedy", href: "/genre/comedy" },
      { label: "Drama", href: "/genre/drama" },
      { label: "Sci-Fi", href: "/genre/sci-fi" },
      { label: "Animation", href: "/genre/animation" },
    ],
  },
];

export function Footer() {
  const [viewers, setViewers] = useState<number>(1);

  useEffect(() => {
    // Generate or retrieve persistent session ID for this browser tab
    let sessionId: string;
    try {
      const stored = sessionStorage.getItem("gorib_viewer_session");
      if (stored) {
        sessionId = stored;
      } else {
        sessionId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem("gorib_viewer_session", sessionId);
      }
    } catch {
      sessionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    let isMounted = true;

    // Heartbeat function to report real presence and receive live visitor count
    const pingPresence = async (action: "ping" | "leave" = "ping") => {
      try {
        const res = await fetch("/api/viewers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, action }),
          cache: "no-store",
        });
        if (res.ok && isMounted && action === "ping") {
          const data = (await res.json()) as { count?: number };
          if (typeof data.count === "number") {
            setViewers(data.count);
          }
        }
      } catch {
        // Keep current count on offline/network error
      }
    };

    // Initial ping on mount
    pingPresence("ping");

    // Ping every 15 seconds while user is actively browsing
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        pingPresence("ping");
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pingPresence("ping");
      }
    };

    const handleBeforeUnload = () => {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const payload = JSON.stringify({ sessionId, action: "leave" });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/viewers", blob);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleBeforeUnload);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-auto w-full border-t border-line bg-canvas text-fg-subtle">
      <div className="shell mx-auto max-w-[1400px] py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              Movies, series and live TV in one place, with a fast, distraction-free player.
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="mb-3 text-sm font-semibold text-fg-muted">{col.title}</h2>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-white hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 md:col-span-1">
            <h2 className="mb-3 text-sm font-semibold text-fg-muted">About</h2>
            <p className="text-xs leading-relaxed">
              Metadata and imagery are provided by TMDB; this product is not endorsed or certified by TMDB. Live TV
              channel listings come from the open-source iptv-org project. No video files are stored on our servers.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-line pt-6 text-xs sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} gorib.lol</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2" aria-live="polite">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>
                <span className="font-semibold tabular-nums text-fg-muted">{viewers.toLocaleString()}</span> watching now
              </span>
            </span>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              Back to top
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
