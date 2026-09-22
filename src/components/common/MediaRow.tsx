"use client";

import React, { useRef } from "react";
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
    <section className="relative my-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors uppercase tracking-wider"
          >
            Explore All →
          </Link>
        )}
      </div>

      {/* Slider Container */}
      <div className="group relative">
        {/* Left Arrow */}
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className="absolute -left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-30 hidden group-hover:flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white shadow-xl backdrop-blur-md border border-zinc-800 hover:bg-amber-500 hover:text-black transition-all"
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={rowRef}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-4 pt-1"
        >
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="w-36 sm:w-44 md:w-48 lg:w-52 flex-shrink-0"
            >
              <MediaCard item={item} priority={idx < 4} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          onClick={() => handleScroll("right")}
          className="absolute -right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-30 hidden group-hover:flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-white shadow-xl backdrop-blur-md border border-zinc-800 hover:bg-amber-500 hover:text-black transition-all"
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}

