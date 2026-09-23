"use client";

import React from "react";
import Link from "next/link";
import { PlaySquare, ArrowUp, Film, Radio, Sparkles } from "lucide-react";

export function Footer() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full border-t border-zinc-900/80 bg-[#05070a] text-zinc-400">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 pt-12 pb-14 sm:pt-14 sm:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 sm:gap-10 xl:gap-12">
          {/* Brand & Mission Col */}
          <div className="sm:col-span-2 md:col-span-1 lg:col-span-1 xl:col-span-1 space-y-4">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <PlaySquare className="h-5 w-5 fill-black text-black" />
              </div>
              <span className="text-2xl font-black tracking-wider text-white">
                GORIB<span className="text-amber-500">.LOL</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-zinc-400">
              A premium cinematic entertainment platform providing instant access to high-definition movies and television series.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                <Sparkles className="h-3 w-3 text-amber-500" />
                1080p HD
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                <Film className="h-3 w-3 text-amber-500" />
                BDIX Fast
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                <Radio className="h-3 w-3 text-emerald-400" />
                Live Streams
              </span>
            </div>
          </div>

          {/* Navigation / Explore */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/movies" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Movies
                </Link>
              </li>
              <li>
                <Link href="/tv" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  TV Shows
                </Link>
              </li>
              <li>
                <Link href="/live-tv" className="text-zinc-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5">
                  <span>Live TV</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  My List
                </Link>
              </li>
            </ul>
          </div>

          {/* Regional Cinema */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Regional Cinema</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/movies?language=bn" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Bangla Cinema
                </Link>
              </li>
              <li>
                <Link href="/movies?language=hi" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Hindi / Bollywood
                </Link>
              </li>
              <li>
                <Link href="/movies?language=south" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  South Indian
                </Link>
              </li>
              <li>
                <Link href="/movies?sort=vote_average.desc" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Top Rated Movies
                </Link>
              </li>
              <li>
                <Link href="/tv?sort=popularity.desc" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Popular TV Series
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Genres */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Popular Genres</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/genre/action" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Action
                </Link>
              </li>
              <li>
                <Link href="/genre/comedy" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Comedy
                </Link>
              </li>
              <li>
                <Link href="/genre/drama" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Drama
                </Link>
              </li>
              <li>
                <Link href="/genre/sci-fi" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Sci-Fi
                </Link>
              </li>
              <li>
                <Link href="/genre/animation" className="text-zinc-400 hover:text-amber-400 transition-colors">
                  Animation
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Attribution */}
          <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-1 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Disclaimer & Attribution</h4>
            <p className="text-xs leading-relaxed text-zinc-500">
              This product uses the TMDB API for movie and television metadata, posters, and imagery, but is not endorsed or certified by TMDB. Live TV broadcast streams and channel directories are provided courtesy of the open-source iptv-org project.
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              gorib.lol does not store any files or streams on its servers. All streams are retrieved via external streaming providers and publicly accessible broadcast feeds.
            </p>
          </div>
        </div>

        {/* Bottom Bar / Copyright */}
        <div className="mt-10 sm:mt-12 lg:mt-16 border-t border-zinc-900/80 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} gorib.lol. All rights reserved.
            </p>
            <p className="text-zinc-600 text-center text-[11px] sm:text-xs">
              Non-commercial educational demonstration • High-definition streaming
            </p>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-amber-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
              aria-label="Scroll back to top"
            >
              <span>Back to top</span>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
