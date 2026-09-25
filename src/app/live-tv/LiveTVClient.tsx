"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { IPTVChannel, IPTVCategory, IPTVCountry } from "@/types/iptv";
import { StreamSource } from "@/types/streaming";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { ChannelCard } from "@/components/iptv/ChannelCard";
import { AdSlot } from "@/components/ads/AdSlot";
import { EmptyState } from "@/components/common/EmptyState";
import { useLiveTVFavorites } from "@/lib/hooks/useLiveTVFavorites";
import {
  Tv,
  Search,
  Star,
  Share2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  RefreshCw,
  Loader2,
  ExternalLink,
  Check,
  X,
  LayoutGrid,
  Newspaper,
  Trophy,
  Clapperboard,
  Popcorn,
  Blocks,
  Music,
  Compass,
  MonitorPlay,
  Laugh,
  Sparkles,
  HandHeart,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  news: Newspaper,
  sports: Trophy,
  movies: Clapperboard,
  entertainment: Popcorn,
  kids: Blocks,
  music: Music,
  documentary: Compass,
  series: MonitorPlay,
  comedy: Laugh,
  lifestyle: Sparkles,
  religious: HandHeart,
  education: GraduationCap,
};

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
  const [sourceIndex, setSourceIndex] = useState<number>(0);

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
    setSourceIndex(0);

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

    const proxied: StreamSource = {
      url: `/api/iptv/proxy?url=${encodeURIComponent(activeChannel.url)}`,
      format: "hls",
      quality: q,
      serverName: "Proxy",
    };
    // An https page can't load http:// streams (mixed content), so those go straight to the proxy.
    // Otherwise try direct first; the player falls back to the proxy if it fails.
    if (activeChannel.url.startsWith("http://")) return [proxied];
    return [{ url: activeChannel.url, format: "hls", quality: q, serverName: "Direct" }, proxied];
  }, [activeChannel]);

  const activeSourceIndex = Math.min(sourceIndex, playerSources.length - 1);
  const useProxy = playerSources[activeSourceIndex]?.serverName === "Proxy";

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
    <div className="pb-20 pt-16 lg:pt-[68px]">
      <div className="mx-auto w-full max-w-[1800px] sm:px-6 sm:pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:px-10 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {activeChannel && (
            <VideoPlayer
              key={activeChannel.id}
              title={activeChannel.name}
              sources={playerSources}
              activeSourceIndex={activeSourceIndex}
              onSourceChange={setSourceIndex}
              isLive={true}
            />
          )}

          <div className="shell sm:px-0">
            {activeChannel ? (
              <div className="mt-5 flex flex-col gap-4 border-b border-line pb-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-black p-2">
                    {activeChannel.logo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={activeChannel.logo} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Tv className="h-6 w-6 text-fg-muted" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="eyebrow flex items-center gap-2 text-accent">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                      Live now
                    </p>
                    <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">{activeChannel.name}</h1>
                    <p className="meta-dot mt-1 flex flex-wrap items-center text-sm text-fg-muted">
                      {activeChannel.group && <span>{activeChannel.group}</span>}
                      {activeChannel.country && <span className="uppercase">{activeChannel.country}</span>}
                      {activeChannel.quality && <span>{activeChannel.quality}</span>}
                      {useProxy && <span>Proxied</span>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handlePrevChannel} className="btn btn-secondary btn-sm" aria-label="Previous channel">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Prev
                  </button>
                  <button type="button" onClick={handleNextChannel} className="btn btn-secondary btn-sm" aria-label="Next channel">
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(activeChannel.id)}
                    aria-pressed={isFavorite(activeChannel.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Star
                      className={`h-4 w-4 ${isFavorite(activeChannel.id) ? "fill-rating text-rating" : ""}`}
                      aria-hidden="true"
                    />
                    {isFavorite(activeChannel.id) ? "Favorited" : "Favorite"}
                  </button>
                  <button type="button" onClick={handleShare} className="btn btn-ghost btn-sm">
                    {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
                    {copied ? "Link copied" : "Share"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceIndex(useProxy ? 0 : playerSources.length - 1)}
                    disabled={playerSources.length < 2}
                    aria-pressed={useProxy}
                    className="btn btn-ghost btn-sm"
                    title="Route the stream through our proxy if it won't load directly"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {useProxy ? "Proxy on" : "Not loading? Use proxy"}
                  </button>
                  <a href={`vlc://${activeChannel.url}`} className="btn btn-ghost btn-sm hidden sm:inline-flex">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Open in VLC
                  </a>
                </div>
              </div>
            ) : (
              <h1 className="page-title mt-10">Live TV</h1>
            )}

            <AdSlot placement="live-tv-banner" />
          </div>
        </div>

        {/* Channel sidebar: beside the player on desktop, stacked below it on mobile. Size containment
            stops the list from setting the row height, so the panel matches the player column. */}
        <aside
          aria-labelledby="channels-heading"
          className="shell mt-8 sm:px-0 lg:mt-0 lg:flex lg:min-h-[560px] lg:flex-col lg:[contain:size] lg:overflow-hidden lg:rounded-lg lg:border lg:border-line lg:bg-surface lg:p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="channels-heading" className="section-title">
              Channels
            </h2>
            <p className="text-xs text-fg-subtle" role="status">
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Loading…
                </span>
              ) : (
                `${displayedChannels.length} channels`
              )}
            </p>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search channels"
              aria-label="Search channels"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input h-10 pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-white"
                aria-label="Clear channel search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="no-scrollbar -mx-[max(1rem,4vw)] mt-3 flex items-center gap-2 overflow-x-auto px-[max(1rem,4vw)] pb-1 sm:mx-0 sm:px-0 lg:-mx-4 lg:px-4" role="group" aria-label="Country">
            {popularCountryPills.map((cp) => (
              <button
                key={cp.code}
                type="button"
                onClick={() => setSelectedCountry(cp.code)}
                aria-pressed={selectedCountry === cp.code}
                className="chip"
              >
                {cp.name}
              </button>
            ))}
            <div className="relative flex-shrink-0">
              <select
                value={popularCountryPills.some((p) => p.code === selectedCountry) ? "" : selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value || "all")}
                aria-label="More countries"
                className={`chip cursor-pointer appearance-none bg-transparent pr-8 ${
                  popularCountryPills.some((p) => p.code === selectedCountry) ? "" : "chip-active"
                }`}
              >
                <option value="" className="bg-surface text-white">
                  More countries
                </option>
                {countries
                  .filter((c) => !popularCountryPills.some((p) => p.code.toLowerCase() === c.code.toLowerCase()))
                  .map((c) => (
                    <option key={c.code} value={c.code} className="bg-surface text-white">
                      {c.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
            </div>
          </div>

          <div className="no-scrollbar -mx-[max(1rem,4vw)] mt-2 flex items-center gap-2 overflow-x-auto px-[max(1rem,4vw)] pb-1 sm:mx-0 sm:px-0 lg:-mx-4 lg:px-4" role="group" aria-label="Category">
            <button
              type="button"
              onClick={() => setSelectedCategory("favorites")}
              aria-pressed={selectedCategory === "favorites"}
              className="chip"
            >
              <Star className="h-3.5 w-3.5" aria-hidden="true" />
              Favorites ({favorites.length})
            </button>
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] ?? Tv;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={selectedCategory === cat.id}
                  className="chip"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {cat.name}
                </button>
              );
            })}
          </div>

          {displayedChannels.length > 0 ? (
            <div
              className={`mt-3 grid grid-cols-1 content-start gap-2 sm:grid-cols-2 lg:-mr-2 lg:min-h-0 lg:flex-1 lg:grid-cols-1 lg:overflow-y-auto lg:pr-2 ${
                isLoading ? "opacity-60" : ""
              }`}
            >
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
            <EmptyState
              icon={Tv}
              title="No channels found"
              message={
                selectedCategory === "favorites"
                  ? "Tap the star on any channel to add it to your favorites."
                  : "No channels match this search or filter."
              }
              actionText="Reset filters"
              onAction={() => {
                setSelectedCountry("all");
                setSelectedCategory("all");
                setSearchQuery("");
              }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
