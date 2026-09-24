import { CatalogSort } from "@/types/media";

export interface FilterOption {
  id: string;
  label: string;
}

/** Origin countries (ISO 3166-1) offered as catalog filters. */
export const COUNTRY_FILTERS: FilterOption[] = [
  { id: "US", label: "United States" },
  { id: "GB", label: "United Kingdom" },
  { id: "BD", label: "Bangladesh" },
  { id: "IN", label: "India" },
  { id: "KR", label: "South Korea" },
  { id: "JP", label: "Japan" },
  { id: "CN", label: "China" },
  { id: "PK", label: "Pakistan" },
  { id: "TR", label: "Turkey" },
  { id: "FR", label: "France" },
  { id: "ES", label: "Spain" },
  { id: "DE", label: "Germany" },
  { id: "IT", label: "Italy" },
  { id: "TH", label: "Thailand" },
  { id: "ID", label: "Indonesia" },
  { id: "PH", label: "Philippines" },
  { id: "MX", label: "Mexico" },
  { id: "NG", label: "Nigeria" },
];

/** Original-language filters. "south" expands to Telugu/Tamil/Malayalam/Kannada. */
export const LANGUAGE_FILTERS: FilterOption[] = [
  { id: "bn", label: "Bangla" },
  { id: "hi", label: "Hindi" },
  { id: "south", label: "South Indian" },
  { id: "ta", label: "Tamil" },
  { id: "te", label: "Telugu" },
  { id: "ml", label: "Malayalam" },
  { id: "en", label: "English" },
  { id: "ko", label: "Korean" },
  { id: "ja", label: "Japanese" },
  { id: "zh", label: "Chinese" },
  { id: "ur", label: "Urdu" },
  { id: "tr", label: "Turkish" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "ar", label: "Arabic" },
];

export const SORT_FILTERS: { id: CatalogSort; label: string }[] = [
  { id: "popularity.desc", label: "Popular" },
  { id: "primary_release_date.desc", label: "Latest" },
  { id: "vote_average.desc", label: "Top Rated" },
];

export function getYearFilters(now = new Date()): FilterOption[] {
  const current = now.getFullYear();
  const years: FilterOption[] = [];
  for (let y = current; y > current - 7; y--) {
    years.push({ id: String(y), label: String(y) });
  }
  const firstDecade = Math.floor((current - 7) / 10) * 10;
  for (let d = firstDecade; d >= 1970; d -= 10) {
    years.push({ id: `${d}s`, label: `${d}s` });
  }
  return years;
}

export function parseCatalogSort(value: string | undefined): CatalogSort {
  // Legacy TV links used first_air_date.desc
  if (value === "first_air_date.desc") return "primary_release_date.desc";
  return SORT_FILTERS.some((s) => s.id === value) ? (value as CatalogSort) : "popularity.desc";
}

/** Accepts a single year or a decade key; anything else is ignored. */
export function parseCatalogYear(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /^\d{4}s?$/.test(value) ? value : undefined;
}
