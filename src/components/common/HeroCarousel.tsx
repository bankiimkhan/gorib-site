"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Info } from "lucide-react";
import { MediaItem } from "@/types/media";

/** How long each billboard slide holds before advancing. */
const SLIDE_DURATION_MS = 7000;
const MAX_SLIDES = 5;

interface HeroCarouselProps {
  items: MediaItem[];
}

/**
 * Netflix-style billboard: the latest releases crossfading on a timer, with
 * the active slide's remaining time drawn into its indicator bar.
 */
export function HeroCarousel({ items }: HeroCarouselProps) {
  const slides = items.slice(0, MAX_SLIDES);
  const count = slides.length;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  // Readers who ask for reduced motion get a static first slide.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoPlay(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || !autoPlay || count <= 1) return;
    const id = window.setInterval(
      () => setActive((index) => (index + 1) % count),
      SLIDE_DURATION_MS
    );
    return () => window.clearInterval(id);
  }, [paused, autoPlay, count]);

  // A shorter list on re-render must not strand the index past the end.
  const current = active < count ? active : 0;

  const goTo = useCallback((index: number) => setActive(index), []);

  if (count === 0) return null;

  return (
    <section
      className="relative h-[80vh] min-h-[520px] max-h-[860px] w-full overflow-hidden bg-black"
      aria-roledescription="carousel"
      aria-label="Latest releases"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((item, index) => {
        const isActive = index === current;
        const watchUrl =
          item.type === "tv" ? `/watch/tv/${item.tmdbId}` : `/watch/movie/${item.tmdbId}`;
        const detailUrl = item.type === "tv" ? `/tv/${item.tmdbId}` : `/movie/${item.tmdbId}`;

        return (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!isActive}
          >
            {item.backdropUrl && (
              <Image
                src={item.backdropUrl}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover object-top"
              />
            )}

            {/* Netflix's billboard scrim: dark from the left, fading up from the bottom. */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-transparent to-black/40" />

            <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 sm:px-6 lg:px-8 pb-24 sm:pb-28">
              <div className="max-w-xl space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                  <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                    New Release
                  </span>
                  {item.rating !== undefined && item.rating > 0 && (
                    <span className="text-emerald-400">
                      {Math.round(item.rating * 10)}% Match
                    </span>
                  )}
                  {item.year && <span className="text-zinc-300">{item.year}</span>}
                </div>

                <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-2xl sm:text-6xl lg:text-7xl">
                  {item.title}
                </h1>

                <p className="line-clamp-3 text-sm leading-relaxed text-zinc-200 drop-shadow-lg sm:text-base">
                  {item.overview}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={watchUrl}
                    tabIndex={isActive ? undefined : -1}
                    className="flex items-center gap-2 rounded bg-white px-7 py-2.5 text-sm font-bold text-black transition-colors hover:bg-white/80"
                  >
                    <Play className="h-5 w-5 fill-black" />
                    <span>Play</span>
                  </Link>

                  <Link
                    href={detailUrl}
                    tabIndex={isActive ? undefined : -1}
                    className="flex items-center gap-2 rounded bg-zinc-500/70 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-zinc-500/50"
                  >
                    <Info className="h-5 w-5" />
                    <span>More Info</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <div className="absolute bottom-10 right-4 z-20 flex items-center gap-2 sm:right-6 lg:right-8">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show ${item.title}`}
              aria-current={index === current}
              className="group h-1 w-8 overflow-hidden rounded-full bg-white/30 transition-colors hover:bg-white/50"
            >
              <span
                className={`block h-full bg-white ${
                  index === current
                    ? autoPlay && !paused
                      ? "animate-hero-progress"
                      : "w-full"
                    : "w-0"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
