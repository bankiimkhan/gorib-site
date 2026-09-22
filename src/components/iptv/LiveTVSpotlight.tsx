import React from "react";
import Link from "next/link";
import { Radio, ChevronRight, Tv, Play } from "lucide-react";

export function LiveTVSpotlight() {
  const previewChannels = [
    { name: "ATN Bangla", flag: "🇧🇩", category: "General" },
    { name: "Sky News", flag: "🇬🇧", category: "News" },
    { name: "Al Jazeera", flag: "🌍", category: "News" },
    { name: "Red Bull TV", flag: "⚽", category: "Sports" },
    { name: "Pluto Movies", flag: "🎬", category: "Movies" },
    { name: "NASA TV", flag: "🚀", category: "Science" },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-950/30 via-zinc-900/80 to-zinc-900/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {/* Ambient glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-600/20 px-3 py-1 text-xs font-bold text-red-400 border border-red-500/30 tracking-wide uppercase">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>Live Broadcasts</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Watch Live TV Channels
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Stream free-to-air regional and global channels. Live 24/7 news, world football & sports, movies, and family entertainment with zero sign-up required.
            </p>

            {/* Quick previews */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {previewChannels.map((ch) => (
                <div
                  key={ch.name}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300 border border-zinc-700/60"
                >
                  <span>{ch.flag}</span>
                  <span className="font-medium text-white">{ch.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/live-tv"
              className="group flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:from-red-500 hover:to-amber-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Watch Live TV Now</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

