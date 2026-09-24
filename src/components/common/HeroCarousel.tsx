"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Info, Star } from "lucide-react";
import { MediaItem } from "@/types/media";
import { formatRating } from "@/lib/utils/formatters";
import { mediaHref, watchHref } from "@/lib/utils/routes";
import { WatchlistButton } from "./WatchlistButton";

/** How long each billboard slide holds before advancing (mirrors .animate-hero-progress). */
const SLIDE_DURATION_MS = 8000;
const MAX_SLIDES = 5;

interface HeroCarouselProps {
  items: MediaItem[];
  label?: string;
  badge?: string;
}

/**
 * Billboard hero: large backdrop crossfading on a timer, layered scrims that
 * melt into the page, and one obvious Play action.
 */
export function HeroCarousel({ items, label = "Featured titles", badge = "New Release" }: HeroCarouselProps) {
  const slides = items.filter((i) => i.backdropUrl).slice(0, MAX_SLIDES);
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
    const id = window.setTimeout(() => setActive((index) => (index + 1) % count), SLIDE_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [active, paused, autoPlay, count]);

  if (count === 0) return null;

  // A shorter list on re-render must not strand the index past the end.
  const current = active < count ? active : 0;
  const isNear = (index: number) =>
    index === current || index === (current + 1) % count || index === (current - 1 + count) % count;

  return (
    <section
      className="relative h-[72svh] min-h-[460px] w-full overflow-hidden bg-black sm:h-[80svh] sm:max-h-[920px] sm:min-h-[540px]"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((item, index) => {
        const isActive = index === current;
        const genres = item.genres.slice(0, 3).map((g) => g.name);

        return (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!isActive}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}: ${item.title}`}
            inert={!isActive}
          >
            {isNear(index) && item.backdropUrl && (
              <Image
                src={item.backdropUrl}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className={`object-cover object-[center_20%] transition-transform duration-[9000ms] ease-linear motion-reduce:transition-none ${
                  isActive ? "scale-105" : "scale-100"
                }`}
              />
            )}

            {/* Layered scrims: left for legibility, bottom to melt into the rails. */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent sm:via-black/30" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-canvas via-canvas/60 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />

            <div className="shell relative z-10 flex h-full items-end pb-20 sm:pb-28 lg:pb-32">
              <div key={isActive ? `on-${current}` : "off"} className={`max-w-2xl ${isActive ? "animate-fade-up" : ""}`}>
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                  <span className="h-4 w-1 rounded-full bg-accent" aria-hidden="true" />
                  {badge}
                  {item.type === "tv" && <span className="text-fg-muted">· Series</span>}
                </p>

                <h2 className="line-clamp-2 text-4xl font-black leading-[1.02] tracking-tight text-white text-shadow-hero sm:text-6xl lg:text-7xl">
                  {item.title}
                </h2>

                <div className="meta-dot mt-4 flex flex-wrap items-center text-sm font-medium text-white/85">
                  {item.rating !== undefined && item.rating > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-rating">
                      <Star className="h-3.5 w-3.5 fill-rating" aria-hidden="true" />
                      {formatRating(item.rating)}
                    </span>
                  )}
                  {item.year && <span>{item.year}</span>}
                  {genres.length > 0 && <span>{genres.join(" · ")}</span>}
                </div>

                <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/80 text-shadow-hero sm:line-clamp-3 sm:text-base">
                  {item.overview}
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <Link href={watchHref(item)} className="btn btn-primary btn-lg">
                    <Play className="h-5 w-5 fill-black" aria-hidden="true" />
                    Play
                  </Link>
                  <Link href={mediaHref(item)} className="btn btn-secondary btn-lg">
                    <Info className="h-5 w-5" aria-hidden="true" />
                    <span>
                      More Info<span className="sr-only"> about {item.title}</span>
                    </span>
                  </Link>
                  <WatchlistButton item={item} className="h-11 w-11 sm:h-12 sm:w-12" />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <div className="shell absolute inset-x-0 bottom-8 z-20 flex justify-end gap-1.5 sm:bottom-12">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show ${item.title}`}
              aria-current={index === current ? "true" : undefined}
              className="group relative flex h-6 w-7 items-center sm:w-9"
            >
              <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/30 transition-colors group-hover:bg-white/50">
                <span
                  key={index === current ? `bar-${current}` : undefined}
                  className={`absolute inset-0 origin-left bg-white ${
                    index === current ? (autoPlay && !paused ? "animate-hero-progress" : "") : "scale-x-0"
                  }`}
                  style={index === current && (!autoPlay || paused) ? { transform: "scaleX(1)" } : undefined}
                />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
