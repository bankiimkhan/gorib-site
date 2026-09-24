"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RailProps {
  title: string;
  /** Optional "Explore all" destination. */
  href?: string;
  /** `<li>` elements, one per tile. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontal content rail: edge-to-edge scroll track aligned to the page
 * gutter, touch/trackpad scrolling everywhere, and paging arrows that appear
 * on hover for pointer devices.
 */
export function Rail({ title, href, children, className = "" }: RailProps) {
  const headingId = useId();
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  const page = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow =
    "absolute inset-y-3 z-20 hidden w-[max(1rem,4vw)] items-center justify-center text-white opacity-0 transition-opacity duration-200 focus-visible:opacity-100 group-hover/rail:opacity-100 md:flex";

  return (
    <section aria-labelledby={headingId} className={`group/rail relative py-2 sm:py-3 ${className}`}>
      <div className="shell mb-1 flex items-baseline gap-3">
        <h2 id={headingId} className="section-title">
          {href ? (
            <Link href={href} className="group/title inline-flex items-baseline gap-2 rounded">
              {title}
              <span className="flex items-center text-xs font-semibold text-fg-muted transition-[opacity,transform] duration-200 md:-translate-x-1 md:opacity-0 md:group-hover/rail:translate-x-0 md:group-hover/rail:opacity-100 group-hover/title:text-white">
                Explore all
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          ) : (
            title
          )}
        </h2>
      </div>

      <div className="relative">
        {canPrev && (
          <button
            type="button"
            onClick={() => page(-1)}
            className={`${arrow} left-0 bg-gradient-to-r from-canvas/95 via-canvas/60 to-transparent`}
            aria-label={`Scroll ${title} back`}
          >
            <ChevronLeft className="h-9 w-9 transition-transform hover:scale-125" aria-hidden="true" />
          </button>
        )}

        <ul
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-px-[max(1rem,4vw)] px-[max(1rem,4vw)] py-3 sm:gap-3 md:snap-none"
        >
          {children}
        </ul>

        {canNext && (
          <button
            type="button"
            onClick={() => page(1)}
            className={`${arrow} right-0 bg-gradient-to-l from-canvas/95 via-canvas/60 to-transparent`}
            aria-label={`Scroll ${title} forward`}
          >
            <ChevronRight className="h-9 w-9 transition-transform hover:scale-125" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
