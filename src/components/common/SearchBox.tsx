"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, Film, Loader2, Search, X } from "lucide-react";
import { MediaItem } from "@/types/media";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { readRecentSearches, saveRecentSearch } from "@/lib/utils/recentSearches";
import { mediaHref } from "@/lib/utils/routes";

const MAX_SUGGESTIONS = 6;

interface SearchBoxProps {
  autoFocus?: boolean;
  onNavigate?: () => void;
  className?: string;
}

/**
 * Header search with instant suggestions (debounced, abortable, cached by the
 * /api/search route), keyboard navigation, and device-local recent searches.
 */
export function SearchBox({ autoFocus = false, onNavigate, className = "" }: SearchBoxProps) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<{ q: string; items: MediaItem[] }>({ q: "", items: [] });

  const debounced = useDebounce(query.trim(), 250);
  const loading = debounced.length >= 2 && results.q !== debounced;
  const suggestions = debounced.length >= 2 ? results.items : [];

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setResults({ q: debounced, items: (data.items || []).slice(0, MAX_SUGGESTIONS) }))
      .catch((err) => {
        if (err?.name !== "AbortError") setResults({ q: debounced, items: [] });
      });
    return () => controller.abort();
  }, [debounced]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const handle = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [open]);

  const goTo = (href: string, remember?: string) => {
    if (remember) saveRecentSearch(remember);
    setOpen(false);
    setActive(-1);
    onNavigate?.();
    router.push(href);
  };

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    goTo(`/search?q=${encodeURIComponent(trimmed)}`, trimmed);
  };

  const showRecent = open && query.trim().length < 2 && recent.length > 0;
  const showSuggestions = open && debounced.length >= 2;
  const options: { key: string; onSelect: () => void }[] = showSuggestions
    ? [
        ...suggestions.map((item) => ({
          key: item.id,
          onSelect: () => goTo(mediaHref(item), debounced),
        })),
        { key: "all", onSelect: () => submit(query) },
      ]
    : showRecent
      ? recent.map((q) => ({ key: `recent-${q}`, onSelect: () => submit(q) }))
      : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (options.length ? (i - 1 + options.length) % options.length : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && options[active]) options[active].onSelect();
      else submit(query);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Titles, people, genres"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setRecent(readRecentSearches());
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showRecent || showSuggestions}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          aria-label="Search movies and TV shows"
          className="input h-10 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg-subtle" aria-hidden="true" />
        ) : (
          query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-fg-subtle hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )
        )}
      </form>

      {(showRecent || showSuggestions) && (
        <ul
          id={listId}
          role="listbox"
          className="popover animate-fade-in absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto p-1.5"
        >
          {showRecent &&
            recent.map((q, i) => (
              <li
                key={q}
                id={optionId(i)}
                role="option"
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => submit(q)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-fg-muted ${
                  active === i ? "bg-white/10 text-white" : "hover:bg-white/5"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
                {q}
              </li>
            ))}

          {showSuggestions && !loading && suggestions.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-fg-subtle">No matches for “{debounced}”</li>
          )}

          {showSuggestions &&
            suggestions.map((item, i) => (
              <li
                key={item.id}
                id={optionId(i)}
                role="option"
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => options[i].onSelect()}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 ${
                  active === i ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="relative flex h-14 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-surface-2">
                  {item.posterUrl ? (
                    <Image src={item.posterUrl} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <Film className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{item.title}</p>
                  <p className="text-xs text-fg-subtle">
                    {item.type === "tv" ? "TV Series" : "Movie"}
                    {item.year ? ` · ${item.year}` : ""}
                  </p>
                </div>
              </li>
            ))}

          {showSuggestions && (
            <li
              id={optionId(suggestions.length)}
              role="option"
              aria-selected={active === suggestions.length}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submit(query)}
              className={`mt-1 cursor-pointer rounded-md border-t border-line px-3 py-2.5 text-center text-xs font-semibold text-white ${
                active === suggestions.length ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              See all results for “{query.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
