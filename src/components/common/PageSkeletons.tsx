import React from "react";
import { PosterGridSkeleton, Skeleton } from "./Skeleton";

/** Route-level loading UI shown instantly on navigation while server data streams in. */

export function CatalogPageSkeleton() {
  return (
    <div className="shell pb-16 pt-24 sm:pt-28" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8">
        <PosterGridSkeleton count={24} />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="min-h-screen pb-16" aria-busy="true" aria-label="Loading">
      <div className="relative h-[56vw] max-h-[80svh] min-h-[320px] w-full animate-shimmer md:h-[72svh]">
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/40 to-transparent" />
        <div className="shell absolute inset-x-0 bottom-10 hidden space-y-4 md:block">
          <Skeleton className="h-14 w-1/2 max-w-xl" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-2/3 max-w-xl" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </div>
      <div className="shell space-y-4 pt-4 md:hidden">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function WatchPageSkeleton() {
  return (
    <div className="pb-16 pt-16 lg:pt-[68px]" aria-busy="true" aria-label="Loading player">
      <div className="mx-auto w-full max-w-[1600px] sm:px-6 sm:pt-4 lg:px-10">
        <div className="aspect-video w-full animate-shimmer sm:rounded-lg" />
      </div>
      <div className="shell mx-auto mt-6 max-w-[1600px] space-y-3">
        <Skeleton className="h-8 w-2/3 max-w-lg" />
        <Skeleton className="h-4 w-full max-w-3xl" />
      </div>
    </div>
  );
}
