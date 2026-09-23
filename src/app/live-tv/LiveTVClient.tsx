"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { IPTVChannel, IPTVCategory, IPTVCountry } from "@/types/iptv";
import { StreamSource } from "@/types/streaming";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { ChannelCard } from "@/components/iptv/ChannelCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { useLiveTVFavorites } from "@/lib/hooks/useLiveTVFavorites";
import {
  Tv,
  Search,
  Star,
  Share2,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Radio,
  ExternalLink,
  Check,
  X,
} from "lucide-react";

interface LiveTVClientProps {
  initialChannels: IPTVChannel[];
  categories: IPTVCategory[];
  countries: IPTVCountry[];
}

export function LiveTVClient({
  initialChannels,
  categories,
  countries,
}: LiveTVClientProps) {
  const [channels, setChannels] = useState<IPTVChannel[]>(initialChannels);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel>(
    initialChannels[0] || null
  );

  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loadedFilters, setLoadedFilters] = useState<{
    country: string;
    category: string;
  }>({ country: "all", category: "all" });
  const [copied, setCopied] = useState<boolean>(false);
  const [useProxy, setUseProxy] = useState<boolean>(false);

  const isFirstMount = useRef(true);
  const { favorites, isFavorite, toggleFavorite } = useLiveTVFavorites();

  const isLoading =
    selectedCategory !== "favorites" &&
    (selectedCountry !== loadedFilters.country ||
      selectedCategory !== loadedFilters.category);

  // Parse URL search params on mount to pick channel or filters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const channelId = params.get("channel");
    const country = params.get("country");
    const category = params.get("category");

    if (country || category || channelId) {
      const timer = setTimeout(() => {
        if (country) setSelectedCountry(country);
        if (category) setSelectedCategory(category);
        if (channelId) {
          const match = initialChannels.find((c) => c.id === channelId);
          if (match) {
            setActiveChannel(match);
          }
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialChannels]);

  // Fetch channels when country or category changes, skipping redundant first fetch
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (selectedCountry === "all" && selectedCategory === "all") {
        return;
      }
    }

    if (selectedCategory === "favorites") {
      return; // Handled client-side from favorites
    }

    let isMounted = true;

    const params = new URLSearchParams();
    if (selectedCountry !== "all") params.set("country", selectedCountry);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    params.set("limit", "100");

    fetch(`/api/iptv/channels?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.channels) {
            setChannels(data.channels);
            // If activeChannel is not in the new list, pick the first one
            if (
              data.channels.length > 0 &&
              !data.channels.some((c: IPTVChannel) => c.id === activeChannel?.id)
            ) {
              setActiveChannel(data.channels[0]);
            }
          }
          setLoadedFilters({ country: selectedCountry, category: selectedCategory });
        }
      })
      .catch((err) => {
        console.error("Error fetching channels:", err);
        if (isMounted) {
          setLoadedFilters({ country: selectedCountry, category: selectedCategory });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCountry, selectedCategory, activeChannel?.id]);

  // Handle selecting a channel
  const handleSelectChannel = (channel: IPTVChannel) => {
    setActiveChannel(channel);
    setUseProxy(false);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("channel", channel.id);
      window.history.replaceState({}, "", url.toString());
    }

    // Scroll smoothly to player on mobile
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Filter channels based on search and favorites
  const displayedChannels = useMemo(() => {
    let list = channels;

    if (selectedCategory === "favorites") {
      list = channels.filter((c) => favorites.includes(c.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.rawName.toLowerCase().includes(q) ||
          (c.group && c.group.toLowerCase().includes(q))
      );
    }

    return list;
  }, [channels, selectedCategory, favorites, searchQuery]);

  // Navigate next/prev channel
  const handleNextChannel = () => {
    if (displayedChannels.length === 0) return;
    const currentIndex = displayedChannels.findIndex((c) => c.id === activeChannel?.id);
    const nextIndex = (currentIndex + 1) % displayedChannels.length;
    handleSelectChannel(displayedChannels[nextIndex]);
  };

  const handlePrevChannel = () => {
    if (displayedChannels.length === 0) return;
    const currentIndex = displayedChannels.findIndex((c) => c.id === activeChannel?.id);
    const prevIndex = (currentIndex - 1 + displayedChannels.length) % displayedChannels.length;
    handleSelectChannel(displayedChannels[prevIndex]);
  };

  const handleShare = () => {
    if (typeof window === "undefined" || !activeChannel) return;
    const shareUrl = `${window.location.origin}/live-tv?channel=${encodeURIComponent(
      activeChannel.id
    )}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Stream URL: direct or proxied
  const streamUrl = useMemo(() => {
    if (!activeChannel) return "";
    if (useProxy) {
      return `/api/iptv/proxy?url=${encodeURIComponent(activeChannel.url)}`;
    }
    return activeChannel.url;
  }, [activeChannel, useProxy]);

  const playerSources: StreamSource[] = useMemo(() => {
    if (!activeChannel) return [];
    let q: "1080p" | "720p" | "480p" | "360p" | "auto" = "auto";
    if (activeChannel.quality) {
      const lower = activeChannel.quality.toLowerCase();
      if (lower.includes("1080")) q = "1080p";
      else if (lower.includes("720")) q = "720p";
      else if (lower.includes("480")) q = "480p";
      else if (lower.includes("360")) q = "360p";
    }

    return [
      {
        url: streamUrl,
        format: "hls" as const,
        quality: q,
        serverName: useProxy ? "Gorib Proxy Server" : "Direct Broadcast Stream",
      },
    ];
  }, [activeChannel, streamUrl, useProxy]);

  // Popular Country pills
  const popularCountryPills = [
    { code: "all", name: "All" },
    { code: "bd", name: "Bangladesh" },
    { code: "in", name: "India" },
    { code: "us", name: "USA" },
    { code: "uk", name: "UK" },
    { code: "ca", name: "Canada" },
    { code: "au", name: "Australia" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-20">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Live TV Channels
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Stream free-to-air international and regional television broadcasts powered by iptv-org.
          </p>
        </div>

        {/* Global Stats badge */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{channels.length}+ Channels Ready</span>
        </div>
      </div>

      {/* Main Grid: Cinema Player Theater */}
      {activeChannel && (
        <div className="mb-10 space-y-4">
          <div className="w-full shadow-2xl rounded-2xl overflow-hidden bg-black ring-1 ring-white/10">
            <VideoPlayer
              key={streamUrl}
              title={activeChannel.name}
              sources={playerSources}
              isLive={true}
            />
          </div>

          {/* Active Channel Details Bar */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4 backdrop-blur-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 p-2 overflow-hidden flex-shrink-0">
                {activeChannel.logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Tv className="h-5 w-5 text-amber-500" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">{activeChannel.name}</h2>
                  <span className="flex items-center gap-1 rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30 uppercase tracking-wide">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300 font-medium">
                    {activeChannel.group}
                  </span>
                  {activeChannel.country && (
                    <span className="uppercase text-zinc-400 font-mono text-[11px]">
                      {activeChannel.country}
                    </span>
                  )}
                  {activeChannel.quality && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 font-bold text-amber-400 text-[10px]">
                      {activeChannel.quality}
                    </span>
                  )}
                  {useProxy && (
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 font-medium text-purple-300 text-[10px] border border-purple-500/30">
                      Proxied Stream
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Prev, Next, Proxy Toggle, VLC, Share, Favorite */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrevChannel}
                className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                title="Previous Channel"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={handleNextChannel}
                className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                title="Next Channel"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setUseProxy((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
                  useProxy
                    ? "bg-purple-600/30 text-purple-300 border-purple-500/40"
                    : "bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-zinc-200"
                }`}
                title="Toggle CORS Proxy mode if the stream fails in browser"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${useProxy ? "animate-spin" : ""}`} />
                <span>{useProxy ? "Proxy On" : "Enable Proxy"}</span>
              </button>

              <a
                href={`vlc://${activeChannel.url}`}
                className="hidden sm:flex items-center gap-1 rounded-lg bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors"
                title="Open stream in VLC Media Player"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>VLC</span>
              </a>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                title="Share Channel Link"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleFavorite(activeChannel.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isFavorite(activeChannel.id)
                    ? "bg-amber-500 text-black font-bold hover:bg-amber-400"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    isFavorite(activeChannel.id) ? "fill-black" : ""
                  }`}
                />
                <span>{isFavorite(activeChannel.id) ? "Favorited" : "Favorite"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live TV Banner Ad Slot */}
      <AdSlot placement="live-tv-banner" />

      {/* Channel Guide & Exploration Section */}
      <div className="space-y-6">
        {/* Filter Controls Bar */}
        <div className="rounded-2xl border border-white/5 bg-[#07090e]/80 p-4 sm:p-5 backdrop-blur-xl space-y-4 shadow-xl">
          {/* Top row: Search input + Country Pills */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <input
                type="text"
                placeholder="Search live channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-4 py-2 pl-10 pr-9 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Country Pills (Horizontally scrollable on mobile) */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
              {popularCountryPills.map((cp) => (
                <button
                  key={cp.code}
                  type="button"
                  onClick={() => setSelectedCountry(cp.code)}
                  className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedCountry === cp.code
                      ? "bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20"
                      : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  <span>{cp.name}</span>
                </button>
              ))}

              {/* All Countries Select Dropdown for less common countries */}
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="flex-shrink-0 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">More Countries...</option>
                {countries
                  .filter(
                    (c) =>
                      !popularCountryPills.some((p) => p.code.toLowerCase() === c.code.toLowerCase())
                  )
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Bottom row: Category Tabs */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            {/* Favorites Tab */}
            <button
              type="button"
              onClick={() => setSelectedCategory("favorites")}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === "favorites"
                  ? "bg-amber-500 text-black font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
              }`}
            >
              <Star
                className={`h-3.5 w-3.5 ${
                  selectedCategory === "favorites" ? "fill-black" : "text-amber-400"
                }`}
              />
              <span>Favorites ({favorites.length})</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? "bg-amber-500 text-black font-bold"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Channels Grid Header */}
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-semibold text-zinc-400">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
                Loading channels...
              </span>
            ) : (
              <span>Showing {displayedChannels.length} channels</span>
            )}
          </div>
        </div>

        {/* Channels Grid */}
        {displayedChannels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayedChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                isActive={activeChannel?.id === channel.id}
                isFavorite={isFavorite(channel.id)}
                onSelect={handleSelectChannel}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <Tv className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No channels found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              {selectedCategory === "favorites"
                ? "You haven't bookmarked any favorite channels yet. Click the star icon on any channel card to add it to your favorites."
                : "No channels match your current search or filter criteria."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCountry("all");
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
