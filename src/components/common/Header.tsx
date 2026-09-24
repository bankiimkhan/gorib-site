"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { MOVIE_GENRES } from "@/lib/api/tmdb/genres";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Movies", href: "/movies" },
  { name: "TV Shows", href: "/tv" },
  { name: "New & Popular", href: "/trending" },
  { name: "Live TV", href: "/live-tv" },
  { name: "My List", href: "/watchlist" },
];

const GENRES = MOVIE_GENRES.filter((g) => g.slug !== "tv-movie");

const REGIONAL_LINKS = [
  { name: "Bangla", href: "/movies?language=bn" },
  { name: "Bollywood", href: "/movies?language=hi" },
  { name: "South Indian", href: "/movies?language=south" },
  { name: "K-Drama", href: "/tv?language=ko&genre=18" },
  { name: "Anime", href: "/tv?language=ja&genre=16" },
];

export function Header() {
  const pathname = usePathname();
  const { watchlist, isLoaded } = useWatchlist();

  const [isScrolled, setIsScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);

  // Close every overlay when the route changes (render-time adjustment).
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setDrawerOpen(false);
    setSearchOpen(false);
    setGenresOpen(false);
  }

  const genresRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Drawer: lock page scroll, move focus in, close on Escape, restore focus.
  useEffect(() => {
    if (!drawerOpen) return;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("input, a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      menuButton?.focus();
    };
  }, [drawerOpen]);

  // Genres popover: close on outside click or Escape.
  useEffect(() => {
    if (!genresOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!genresRef.current?.contains(e.target as Node)) setGenresOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGenresOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [genresOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname?.startsWith(`${href}/`);
  const listCount = isLoaded ? watchlist.length : 0;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Solid bar once scrolled. Kept on its own layer: a backdrop-filter on
          <header> would trap the fixed-position drawer inside it. */}
      <div
        className={`pointer-events-none absolute inset-0 -z-10 bg-canvas/95 shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-md transition-opacity duration-300 ${
          isScrolled ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
      {/* Top scrim keeps the nav legible over bright hero imagery. */}
      <div
        className={`pointer-events-none absolute inset-0 -z-10 h-28 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          isScrolled ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden="true"
      />

      <div className="shell flex h-16 items-center gap-6 lg:h-[68px] lg:gap-10">
        <Logo />

        <nav className="hidden items-center gap-5 lg:flex xl:gap-6" aria-label="Main">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-1.5 text-sm transition-colors ${
                  active ? "font-semibold text-white" : "text-white/75 hover:text-white"
                }`}
              >
                {link.name}
                {link.href === "/live-tv" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                )}
                {link.href === "/watchlist" && listCount > 0 && (
                  <span className="rounded-full bg-white/15 px-1.5 text-[10px] font-bold leading-4 text-white">
                    {listCount}
                    <span className="sr-only"> saved</span>
                  </span>
                )}
              </Link>
            );
          })}

          <div ref={genresRef} className="relative">
            <button
              type="button"
              onClick={() => setGenresOpen((o) => !o)}
              aria-expanded={genresOpen}
              aria-haspopup="true"
              className={`flex items-center gap-1 text-sm transition-colors ${
                genresOpen || pathname?.startsWith("/genre/") ? "text-white" : "text-white/75 hover:text-white"
              }`}
            >
              Genres
              <ChevronDown
                className={`h-4 w-4 transition-transform ${genresOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {genresOpen && (
              <div className="popover animate-fade-in absolute left-1/2 top-full mt-4 w-[420px] -translate-x-1/2 p-3">
                <ul className="grid grid-cols-3 gap-0.5">
                  {GENRES.map((g) => (
                    <li key={g.id}>
                      <Link
                        href={`/genre/${g.slug}`}
                        aria-current={pathname === `/genre/${g.slug}` ? "page" : undefined}
                        className="block rounded px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-white/10 hover:text-white aria-[current]:text-white"
                      >
                        {g.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Desktop: inline search with suggestions */}
          <div className="hidden lg:block">
            {searchOpen ? (
              <div className="animate-fade-in flex items-center gap-1">
                <SearchBox autoFocus className="w-72 xl:w-80" onNavigate={() => setSearchOpen(false)} />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="btn btn-ghost h-9 w-9 px-0"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="btn btn-ghost h-9 w-9 px-0 text-white"
                aria-label="Search"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>

          <Link
            href="/search"
            className="btn btn-ghost h-10 w-10 px-0 text-white lg:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            className="btn btn-ghost h-10 w-10 px-0 text-white lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile / tablet drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="animate-fade-in absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <div
            id="mobile-drawer"
            ref={drawerRef}
            className="animate-slide-in-right absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto border-l border-line bg-canvas pb-10"
          >
            <div className="flex h-16 flex-shrink-0 items-center justify-between px-5">
              <Logo onClick={() => setDrawerOpen(false)} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="btn btn-ghost h-10 w-10 px-0 text-white"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="px-5">
              <SearchBox onNavigate={() => setDrawerOpen(false)} />
            </div>

            <nav aria-label="Main" className="mt-4 px-3">
              <ul>
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setDrawerOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center justify-between rounded-md px-3 py-3 text-base transition-colors ${
                          active
                            ? "bg-white/[0.06] font-semibold text-white"
                            : "text-white/80 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {active && <span className="h-5 w-1 rounded-full bg-accent" aria-hidden="true" />}
                          {link.name}
                          {link.href === "/live-tv" && (
                            <span className="rounded bg-accent px-1.5 py-px text-[10px] font-bold uppercase text-white">
                              Live
                            </span>
                          )}
                        </span>
                        {link.href === "/watchlist" && listCount > 0 && (
                          <span className="text-sm text-fg-muted">{listCount}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-6 border-t border-line px-5 pt-5">
              <p className="eyebrow mb-3">Regional</p>
              <div className="flex flex-wrap gap-2">
                {REGIONAL_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setDrawerOpen(false)} className="chip">
                    {l.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-line px-5 pt-5">
              <p className="eyebrow mb-3">Genres</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <Link
                    key={g.id}
                    href={`/genre/${g.slug}`}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={pathname === `/genre/${g.slug}` ? "page" : undefined}
                    className="chip"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
