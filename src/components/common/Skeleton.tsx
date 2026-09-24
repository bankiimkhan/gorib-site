import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className}`} aria-hidden="true" />;
}

export function MediaCardSkeleton() {
  return (
    <div className="w-full" aria-hidden="true">
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="mt-2 h-3.5 w-3/4 rounded" />
      <Skeleton className="mt-1.5 h-3 w-1/3 rounded" />
    </div>
  );
}

/** Poster grid placeholder matching `.poster-grid`. */
export function PosterGridSkeleton({ count = 16 }: { count?: number }) {
  return (
    <div className="poster-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}
