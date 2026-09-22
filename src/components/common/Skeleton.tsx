import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-lg bg-zinc-800/50 ${className}`}
      aria-hidden="true"
    />
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="flex flex-col space-y-2 w-full">
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 animate-shimmer" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-1/4 rounded" />
        <Skeleton className="h-3 w-1/4 rounded" />
      </div>
    </div>
  );
}

export function MediaRowSkeleton({ title }: { title?: string }) {
  return (
    <section className="space-y-4 px-4 sm:px-6 lg:px-8 py-4">
      {title ? (
        <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
      ) : (
        <Skeleton className="h-6 w-48 rounded" />
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[70vh] min-h-[500px] w-full bg-zinc-950 animate-shimmer">
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-black/40 to-transparent" />
      <div className="absolute bottom-16 left-0 max-w-2xl px-6 sm:px-12 space-y-4">
        <Skeleton className="h-10 w-3/4 rounded-lg" />
        <div className="flex gap-3">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="min-h-screen bg-[#07090e] pt-20">
      <div className="relative h-[50vh] w-full bg-zinc-900 animate-shimmer">
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="aspect-[2/3] w-full max-w-xs rounded-2xl bg-zinc-900 animate-shimmer mx-auto md:mx-0 shadow-2xl" />
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 mt-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

