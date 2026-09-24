import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { discoverMovies, discoverTV } from "@/lib/api/tmdb/client";
import { MOVIE_GENRES, TV_GENRES } from "@/lib/api/tmdb/genres";
import {
  COUNTRY_FILTERS,
  FilterOption,
  getYearFilters,
  LANGUAGE_FILTERS,
  parseCatalogSort,
  parseCatalogYear,
  SORT_FILTERS,
} from "@/lib/api/tmdb/catalogFilters";
import { MediaCard } from "@/components/common/MediaCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { AdSlot } from "@/components/ads/AdSlot";
import { FilterDropdown } from "./FilterDropdown";
import { NativeAdCard } from "@/components/ads/NativeAdCard";

type SearchParams = { [key: string]: string | string[] | undefined };

interface CatalogViewProps {
  type: "movie" | "tv";
  searchParams: SearchParams;
  title: string;
  subtitle: string;
}

const IN_FEED_AD_INDEX = 12;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Shared, server-rendered catalog for /movies and /tv: filter rows (genre,
 * country, year/decade, language, sort) driven entirely by URL params, so every
 * filtered view is linkable, cacheable, and works without client JS.
 */
export async function CatalogView({ type, searchParams, title, subtitle }: CatalogViewProps) {
  const basePath = type === "movie" ? "/movies" : "/tv";
  const genres = type === "movie" ? MOVIE_GENRES : TV_GENRES;

  const genreParam = Number(first(searchParams.genre));
  const genreId = genres.some((g) => g.id === genreParam) ? genreParam : undefined;
  const year = parseCatalogYear(first(searchParams.year));
  const sortBy = parseCatalogSort(first(searchParams.sort));
  const pageParam = Number(first(searchParams.page));
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.min(Math.floor(pageParam), 500) : 1;
  const languageParam = first(searchParams.language);
  const language = LANGUAGE_FILTERS.some((l) => l.id === languageParam) ? languageParam : undefined;
  const countryParam = first(searchParams.country)?.toUpperCase();
  const country = COUNTRY_FILTERS.some((c) => c.id === countryParam) ? countryParam : undefined;

  const options = { genreId, year, sortBy, page, language, originCountry: country };
  const result = type === "movie" ? await discoverMovies(options) : await discoverTV(options);

  const current: Record<string, string | undefined> = {
    genre: genreId ? String(genreId) : undefined,
    country,
    year,
    language,
    sort: sortBy !== "popularity.desc" ? sortBy : undefined,
  };

  const buildHref = (changes: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, page: undefined, ...changes })) {
      if (v !== undefined && v !== "" && !(k === "page" && Number(v) <= 1)) {
        params.set(k, String(v));
      }
    }
    const q = params.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  const rows: { key: string; label: string; options: FilterOption[]; value?: string }[] = [
    { key: "genre", label: "Genre", options: genres.map((g) => ({ id: String(g.id), label: g.name })), value: current.genre },
    { key: "country", label: "Country", options: COUNTRY_FILTERS, value: country },
    { key: "year", label: "Year", options: getYearFilters(), value: year },
    { key: "language", label: "Language", options: LANGUAGE_FILTERS, value: language },
  ];

  const hasFilters = rows.some((r) => r.value) || sortBy !== "popularity.desc";

  const sortLabel = SORT_FILTERS.find((s) => s.id === sortBy)?.label;

  return (
    <div className="shell pb-16 pt-24 sm:pt-28">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="mt-1.5 text-sm text-fg-muted sm:text-base">{subtitle}</p>
        </div>
        {result.totalResults > 0 && (
          <p className="text-sm text-fg-subtle">{result.totalResults.toLocaleString("en-US")} titles</p>
        )}
      </header>

      {/* Filters: each menu is a list of links, so filtered views stay linkable and cacheable. */}
      <nav aria-label={`${title} filters`} className="mb-6 flex flex-wrap items-center gap-2">
        {rows.map((row) => (
          <FilterDropdown
            key={row.key}
            label={row.label}
            value={row.value ? row.options.find((o) => o.id === row.value)?.label ?? row.value : undefined}
            options={[
              { label: `Any ${row.label.toLowerCase()}`, href: buildHref({ [row.key]: undefined }), active: !row.value },
              ...row.options.map((opt) => ({
                label: opt.label,
                href: buildHref({ [row.key]: opt.id }),
                active: row.value === opt.id,
              })),
            ]}
          />
        ))}
        <span className="mx-1 hidden h-6 w-px bg-line-strong sm:block" aria-hidden="true" />
        <FilterDropdown
          label="Sort"
          value={sortBy !== "popularity.desc" ? sortLabel : undefined}
          options={SORT_FILTERS.map((s) => ({
            label: s.label,
            href: buildHref({ sort: s.id === "popularity.desc" ? undefined : s.id }),
            active: sortBy === s.id,
          }))}
        />
        {hasFilters && (
          <Link href={basePath} className="btn btn-ghost btn-sm ml-1 gap-1">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </Link>
        )}
      </nav>

      <AdSlot placement="catalog-header" />

      {result.items.length === 0 ? (
        <EmptyState
          title={`No ${type === "movie" ? "movies" : "shows"} match these filters`}
          message="Try removing a filter or choosing a different year or country."
          actionText="Clear filters"
          actionHref={basePath}
        />
      ) : (
        <div className="poster-grid">
          {result.items.map((item, index) => (
            <React.Fragment key={item.id}>
              {index === IN_FEED_AD_INDEX && <NativeAdCard />}
              <MediaCard item={item} priority={index < 6} />
            </React.Fragment>
          ))}
        </div>
      )}

      <Pagination page={result.page} totalPages={result.totalPages} buildHref={(p) => buildHref({ page: p })} />
    </div>
  );
}
