import React from "react";
import Link from "next/link";
import { PlaySquare } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-[#05070a] pt-12 pb-16 text-zinc-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-black">
                <PlaySquare className="h-4 w-4 fill-black" />
              </div>
              <span className="text-xl font-bold tracking-wider text-white">
                GORIB<span className="text-amber-500">.LOL</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              A premium cinematic entertainment platform providing instant access to high-definition movies and television series.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-amber-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/movies" className="hover:text-amber-400 transition-colors">
                  Movies
                </Link>
              </li>
              <li>
                <Link href="/tv" className="hover:text-amber-400 transition-colors">
                  TV Shows
                </Link>
              </li>
              <li>
                <Link href="/live-tv" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>Live TV</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="hover:text-amber-400 transition-colors">
                  My List
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / TMDB Notice */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Disclaimer & Attribution</h4>
            <p className="text-xs leading-relaxed text-zinc-500">
              This product uses the TMDB API for movie and television metadata, posters, and imagery, but is not endorsed or certified by TMDB. Live TV broadcast streams and channel directories are provided courtesy of the open-source iptv-org project.
            </p>
            <p className="text-xs leading-relaxed text-zinc-500">
              gorib.lol does not store any files or streams on its servers. All streams are retrieved via external streaming providers and publicly accessible broadcast feeds.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-900 pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} gorib.lol. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

