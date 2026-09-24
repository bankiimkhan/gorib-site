import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { MediaItem } from "@/types/media";
import { formatRating } from "@/lib/utils/formatters";

export function RatingBadge({ rating }: { rating?: number }) {
  if (rating === undefined || rating <= 0) return null;
  return (
    <span className="flex items-center gap-1 font-semibold text-rating">
      <Star className="h-4 w-4 fill-rating" aria-hidden="true" />
      <span className="sr-only">Rating</span>
      {formatRating(rating)}
    </span>
  );
}

interface DetailHeroProps {
  item: MediaItem;
  /** "Movie" / "Series" label above the title. */
  kind: string;
  /** Short facts rendered as a dot-separated line (falsy entries are skipped). */
  meta: React.ReactNode[];
  /** Primary actions (Play, My List, …). */
  actions: React.ReactNode;
}

/**
 * Full-bleed backdrop hero for details pages. On desktop the title block sits
 * over the artwork; on phones it stacks under a 16:10 backdrop.
 */
export function DetailHero({ item, kind, meta, actions }: DetailHeroProps) {
  const facts = meta.filter(Boolean);

  return (
    <section className="relative" aria-labelledby="title-heading">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black sm:aspect-video md:aspect-auto md:h-[82svh] md:max-h-[920px] md:min-h-[580px]">
        {item.backdropUrl && (
          <Image
            src={item.backdropUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="animate-fade-in object-cover object-[center_20%]"
          />
        )}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-black/90 via-black/50 to-transparent md:block" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-canvas via-canvas/70 to-transparent md:h-2/3" />
      </div>

      <div className="shell relative z-10 -mt-12 sm:-mt-20 md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:pb-14 lg:pb-16">
        <div className="animate-fade-up flex items-end gap-8 xl:gap-10">
          <div className="relative hidden aspect-[2/3] w-44 flex-shrink-0 overflow-hidden rounded-md bg-surface shadow-pop ring-1 ring-white/10 lg:block xl:w-52">
            {item.posterUrl && (
              <Image src={item.posterUrl} alt={`${item.title} poster`} fill priority sizes="208px" className="object-cover" />
            )}
          </div>

          <div className="min-w-0 max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              <span className="h-4 w-1 rounded-full bg-accent" aria-hidden="true" />
              {kind}
            </p>
            <h1
              id="title-heading"
              className="mt-2 text-3xl font-black leading-[1.05] tracking-tight text-white text-shadow-hero sm:text-5xl lg:text-6xl"
            >
              {item.title}
            </h1>
            {item.tagline && <p className="mt-2 text-sm italic text-white/70 sm:text-base">{item.tagline}</p>}

            {facts.length > 0 && (
              <div className="meta-dot mt-4 flex flex-wrap items-center text-sm font-medium text-white/85">
                {facts.map((fact, i) => (
                  <span key={i} className="flex items-center">
                    {fact}
                  </span>
                ))}
              </div>
            )}

            {item.genres.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-1 gap-y-1 text-sm text-fg-muted">
                {item.genres.map((g, i) => (
                  <li key={g.id}>
                    <Link href={`/genre/${g.slug}`} className="transition-colors hover:text-white hover:underline">
                      {g.name}
                    </Link>
                    {i < item.genres.length - 1 && <span aria-hidden="true">,</span>}
                  </li>
                ))}
              </ul>
            )}

            {item.overview && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 text-shadow-hero sm:text-base md:line-clamp-4">
                {item.overview}
              </p>
            )}

            <div className="mt-6">{actions}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
