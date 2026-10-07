"use client";

import React from "react";
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
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
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
