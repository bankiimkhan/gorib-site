"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { Logo } from "./Logo";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence/tracker";

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
  const [totalVisitors, setTotalVisitors] = useState<number | null>(null);

  useEffect(() => {
    // Fresh presence ID per page load. Not kept in sessionStorage: duplicating a tab copies
    // sessionStorage, which made two open tabs count as one viewer.
    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Persistent per-browser ID so each visitor is counted once in the all-time total
    let visitorId: string | undefined;
    try {
      visitorId = localStorage.getItem("gorib_visitor_id") ?? undefined;
      if (!visitorId) {
        visitorId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("gorib_visitor_id", visitorId);
      }
    } catch {
      // Storage blocked: still show the total, just don't count this browser
    }

    let isMounted = true;
    // Only the first successful ping needs to register the visitor; later pings just read the total
    let visitorRecorded = false;

    // Heartbeat function to report real presence and receive live visitor count
    const pingPresence = async (action: "ping" | "leave" = "ping") => {
      try {
        const res = await fetch("/api/viewers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, visitorId: visitorRecorded ? undefined : visitorId, action }),
          cache: "no-store",
        });
        if (res.ok && isMounted && action === "ping") {
          const data = (await res.json()) as { count?: number; total?: number };
          if (typeof data.count === "number") {
            setViewers(data.count);
          }
          if (typeof data.total === "number") {
            visitorRecorded = true;
            setTotalVisitors(data.total);
          }
        }
      } catch {
        // Keep current count on offline/network error
      }
    };

    // Initial ping on mount
    pingPresence("ping");

    // Keep pinging in background tabs too (e.g. Live TV playing in another tab). Browsers
    // throttle hidden-tab timers to about once a minute; the server timeout allows for that.
    const interval = setInterval(() => pingPresence("ping"), HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pingPresence("ping");
      }
    };

    // pagehide sent "leave"; a page restored from the back/forward cache must rejoin.
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
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
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleBeforeUnload);
      window.removeEventListener("pageshow", handlePageShow);
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2" aria-live="polite">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>
                <span className="font-semibold tabular-nums text-fg-muted">{viewers.toLocaleString()}</span> watching now
              </span>
            </span>
            {totalVisitors !== null && (
              <span>
                <span className="font-semibold tabular-nums text-fg-muted">{totalVisitors.toLocaleString()}</span> all-time
                visitors
              </span>
            )}
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
