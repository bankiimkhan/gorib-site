import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { Film, Star } from "lucide-react";
import { getTrending } from "@/lib/api/tmdb/client";
import { formatRating } from "@/lib/utils/formatters";
import { AdSlot } from "@/components/ads/AdSlot";
import { mediaHref } from "@/lib/utils/routes";

export const metadata: Metadata = {
  title: "New & Popular",
  description: "The most-watched movies and TV shows today and this week.",
};

interface TrendingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const TYPES = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Shows" },
] as const;

const WINDOWS = [
  { id: "day", label: "Today" },
  { id: "week", label: "This Week" },
] as const;

/** Ranked list of TMDB trending titles (two pages = top 40). */
export default async function TrendingPage({ searchParams }: TrendingPageProps) {
  const params = await searchParams;
  const type = TYPES.find((t) => t.id === params.type)?.id ?? "all";
  const timeWindow = WINDOWS.find((w) => w.id === params.window)?.id ?? "day";

  const [p1, p2] = await Promise.all([
    getTrending(type, timeWindow, 1),
    getTrending(type, timeWindow, 2),
  ]);
  const seen = new Set<string>();
  const items = [...p1, ...p2].filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  const href = (t: string, w: string) => {
    const q = new URLSearchParams();
    if (t !== "all") q.set("type", t);
    if (w !== "day") q.set("window", w);
    const s = q.toString();
    return s ? `/trending?${s}` : "/trending";
  };

  return (
    <div className="shell mx-auto max-w-6xl pb-16 pt-24 sm:pt-28">
      <h1 className="page-title">New &amp; Popular</h1>
      <p className="mt-1.5 text-sm text-fg-muted sm:text-base">What everyone is watching, updated throughout the day.</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {WINDOWS.map((w) => (
          <Link
            key={w.id}
            href={href(type, w.id)}
            className="chip h-9 text-sm"
            aria-current={timeWindow === w.id ? "page" : undefined}
          >
            {w.label}
          </Link>
        ))}
        <span className="mx-1 h-6 w-px bg-line-strong" aria-hidden="true" />
        {TYPES.map((t) => (
          <Link
            key={t.id}
            href={href(t.id, timeWindow)}
            className="chip h-9 text-sm"
            aria-current={type === t.id ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <AdSlot placement="catalog-header" />

      <ol className="mt-4 divide-y divide-line">
        {items.map((item, index) => {
          const detailUrl = mediaHref(item);
          const rank = index + 1;
          return (
            <li key={item.id}>
              <Link
                href={detailUrl}
                className="group flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-surface sm:gap-5 sm:px-3"
              >
                <span
                  className={`w-9 flex-shrink-0 text-center text-2xl font-black tabular-nums sm:w-12 sm:text-3xl ${
                    rank <= 3 ? "text-white" : "text-fg-subtle"
                  }`}
                >
                  {rank}
                </span>
                <div className="relative flex aspect-[2/3] w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2 sm:w-16">
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                      priority={index < 6}
                    />
                  ) : (
                    <Film className="h-5 w-5 text-fg-subtle" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg group-hover:text-white sm:text-base">
                    {item.title}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
                    <span className="font-semibold text-fg-muted">
                      {item.type === "tv" ? "Series" : "Movie"}
                    </span>
                    {item.year && <span>{item.year}</span>}
                    {item.genres[0] && <span className="truncate">{item.genres[0].name}</span>}
                  </p>
                  <p className="mt-1 hidden text-sm text-fg-muted sm:line-clamp-1">{item.overview}</p>
                </div>
                {item.rating !== undefined && item.rating > 0 && (
                  <span className="flex flex-shrink-0 items-center gap-1 text-sm font-bold text-rating">
                    <Star className="h-3.5 w-3.5 fill-rating" aria-hidden="true" />
                    {formatRating(item.rating)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
