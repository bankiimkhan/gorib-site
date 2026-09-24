import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

/** Page numbers to show: first, last, and a window around the current page. */
function pageWindow(page: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const base = "flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm font-semibold transition-colors";

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={`${base} text-fg-muted hover:bg-white/10 hover:text-white`} aria-label="Previous page">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${base} text-white/20`} aria-hidden="true">
          <ChevronLeft className="h-5 w-5" />
        </span>
      )}

      {pageWindow(page, totalPages).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-fg-subtle" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`${base} ${p === page ? "bg-white text-black" : "text-fg-muted hover:bg-white/10 hover:text-white"}`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={`${base} text-fg-muted hover:bg-white/10 hover:text-white`} aria-label="Next page">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${base} text-white/20`} aria-hidden="true">
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </nav>
  );
}
