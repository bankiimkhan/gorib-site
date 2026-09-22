"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Film, Search, Bookmark, Menu, X, PlaySquare } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Movies", href: "/movies" },
    { name: "TV Shows", href: "/tv" },
    { name: "Live TV", href: "/live-tv", isLive: true },
    { name: "My List", href: "/watchlist" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#07090e]/95 backdrop-blur-md shadow-lg shadow-black/50 border-b border-zinc-800/40 py-3"
          : "bg-gradient-to-b from-black/80 via-black/40 to-transparent py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <PlaySquare className="h-5 w-5 fill-white text-white" />
            </div>
            <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent text-2xl font-black tracking-wider">
              GORIB<span className="text-amber-500">.LOL</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-zinc-800/80 text-white shadow-inner"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                  }`}
                >
                  <span>{link.name}</span>
                  {link.isLive && (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Search Toggle / Input */}
          <div className="relative">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  type="text"
                  placeholder="Search movies, TV shows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-48 sm:w-64 rounded-full border border-zinc-700 bg-zinc-900/90 px-4 py-1.5 pl-9 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="ml-2 text-xs text-zinc-400 hover:text-white"
                  aria-label="Close search input"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors"
                aria-label="Open search"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Watchlist link */}
          <Link
            href="/watchlist"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors"
            title="My List"
            aria-label="View My Watchlist"
          >
            <Bookmark className="h-4 w-4" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-[#07090e]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3">
          {/* Mobile Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              placeholder="Search movies, TV shows, actors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          </form>

          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-base font-medium transition-colors ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 font-semibold"
                      : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
                  }`}
                >
                  <span>{link.name}</span>
                  {link.isLive && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-600/20 px-2 py-0.5 rounded-full border border-red-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick Regional Links */}
          <div className="pt-2 border-t border-zinc-800/80">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-2">
              Regional Cinema
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/movies?language=bn"
                className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-amber-400"
              >
                🇧🇩 Bangla
              </Link>
              <Link
                href="/movies?language=hi"
                className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-amber-400"
              >
                🇮🇳 Hindi / Bollywood
              </Link>
              <Link
                href="/movies?language=south"
                className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-amber-400"
              >
                🇮🇳 South Indian
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

