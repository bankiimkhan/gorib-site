import React from "react";
import Image from "next/image";
import { ExternalLink, MessageSquare, Play, Star } from "lucide-react";
import { CastMember, Review } from "@/types/media";

/** Sticky in-page navigation between detail sections (no JS, deep-linkable). */
export function SectionNav({ sections }: { sections: { id: string; label: string }[] }) {
  if (sections.length < 2) return null;
  return (
    <nav
      aria-label="Page sections"
      className="sticky top-16 z-30 -mx-[max(1rem,4vw)] mb-8 border-b border-line bg-canvas/95 px-[max(1rem,4vw)] backdrop-blur-md lg:top-[68px]"
    >
      <ul className="no-scrollbar flex gap-6 overflow-x-auto">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="-mb-px block whitespace-nowrap border-b-2 border-transparent py-3.5 text-sm font-semibold text-fg-muted transition-colors hover:border-white hover:text-white"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="section-title mb-4">{children}</h2>
  );
}

/** Horizontal cast strip with round headshots. */
export function CastRow({ cast }: { cast: CastMember[] }) {
  return (
    <ul className="no-scrollbar -mx-[max(1rem,4vw)] flex gap-4 overflow-x-auto px-[max(1rem,4vw)] pb-2">
      {cast.map((actor) => (
        <li key={actor.id} className="w-24 flex-shrink-0 text-center sm:w-28">
          <div className="relative mx-auto mb-2 aspect-square w-20 overflow-hidden rounded-full bg-surface-2 sm:w-24">
            {actor.profileUrl ? (
              <Image src={actor.profileUrl} alt="" fill sizes="96px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-fg-subtle">
                {actor.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <p className="line-clamp-2 text-sm font-medium text-fg">{actor.name}</p>
          <p className="line-clamp-1 text-xs text-fg-subtle">{actor.character}</p>
        </li>
      ))}
    </ul>
  );
}

function youtubeId(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).searchParams.get("v") || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Trailer card: YouTube thumbnail that opens the official trailer on YouTube.
 * Deliberately not embedded, so no third-party player (and its ads) runs on
 * this site.
 */
export function TrailerCard({ trailerUrl, title }: { trailerUrl: string; title: string }) {
  const id = youtubeId(trailerUrl);
  return (
    <a
      href={trailerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-video w-full max-w-3xl overflow-hidden rounded-md bg-surface"
      aria-label={`Watch the ${title} trailer on YouTube (opens in a new tab)`}
    >
      {id && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-80 transition-[opacity,transform] duration-300 group-hover:scale-105 group-hover:opacity-100"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-black/50 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
        <Play className="ml-1 h-7 w-7 fill-white" aria-hidden="true" />
      </span>
      <span className="absolute bottom-3 left-4 flex items-center gap-1.5 text-sm font-semibold text-white">
        Official trailer <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </span>
    </a>
  );
}

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** TMDB user reviews, collapsed to a preview with native expand (no JS). */
export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-fg-subtle">
        <MessageSquare className="h-4 w-4" aria-hidden="true" /> No user reviews yet.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {reviews.map((r) => (
        <li key={r.id} className="panel p-5">
          <div className="mb-2 flex items-center gap-3">
            <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-xs font-bold text-fg-muted">
              {r.avatarUrl ? (
                <Image src={r.avatarUrl} alt="" fill sizes="36px" className="object-cover" />
              ) : (
                r.author.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{r.author}</p>
              <p className="text-xs text-fg-subtle">{formatReviewDate(r.createdAt)}</p>
            </div>
            {r.rating !== undefined && (
              <span className="flex items-center gap-1 text-sm font-bold text-rating">
                <Star className="h-3.5 w-3.5 fill-rating" aria-hidden="true" />
                {r.rating}
              </span>
            )}
          </div>
          <details className="group">
            <summary className="cursor-pointer list-none rounded text-sm leading-relaxed text-fg-muted [&::-webkit-details-marker]:hidden">
              <span className="line-clamp-4 group-open:hidden">{r.content}</span>
              <span className="mt-1 inline-block text-xs font-semibold text-white underline-offset-2 hover:underline group-open:hidden">
                Read more
              </span>
            </summary>
            <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">{r.content}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}

/** Key/value facts ("About" section). Entries without a value are skipped. */
export function FactsList({ facts }: { facts: { label: string; value?: React.ReactNode }[] }) {
  const shown = facts.filter((f) => f.value);
  if (shown.length === 0) return null;
  return (
    <dl className="grid max-w-4xl grid-cols-2 gap-x-8 gap-y-5 text-sm sm:grid-cols-3 lg:grid-cols-4">
      {shown.map((f) => (
        <div key={f.label}>
          <dt className="text-fg-subtle">{f.label}</dt>
          <dd className="mt-1 text-fg">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
