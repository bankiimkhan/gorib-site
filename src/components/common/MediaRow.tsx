"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem } from "@/types/media";
import { MediaCard } from "./MediaCard";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  viewAllHref?: string;
}

export function MediaRow({ title, items, viewAllHref }: MediaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 15);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 15);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = rowRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, items]);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const scrollAmount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative my-7 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-3.5 flex items-end justify-between">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="group flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider"
          >
            <span>Explore All</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        )}
      </div>

      {/* Slider Container */}
      <div className="group relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/85 text-white shadow-2xl backdrop-blur-md border border-white/10 hover:bg-amber-500 hover:text-black hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Scrollable Snap Track */}
        <div
          ref={rowRef}
          className="no-scrollbar flex gap-3.5 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-3 pt-1"
        >
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="w-36 sm:w-44 md:w-48 lg:w-52 flex-shrink-0 snap-start"
            >
              <MediaCard item={item} priority={idx < 4} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/85 text-white shadow-2xl backdrop-blur-md border border-white/10 hover:bg-amber-500 hover:text-black hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </section>
  );
}
