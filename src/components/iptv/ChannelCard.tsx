"use client";

import React, { useState } from "react";
import { IPTVChannel } from "@/types/iptv";
import { Star, Tv, Radio } from "lucide-react";

interface ChannelCardProps {
  channel: IPTVChannel;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: (channel: IPTVChannel) => void;
  onToggleFavorite: (channelId: string) => void;
}

export function ChannelCard({
  channel,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: ChannelCardProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  // Generate fallback initials
  const initials = channel.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "TV";

  return (
    <div
      onClick={() => onSelect(channel)}
      className={`group relative flex items-center gap-3.5 rounded-xl p-3 cursor-pointer transition-all duration-200 border text-left select-none ${
        isActive
          ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40"
          : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/70 hover:border-zinc-700"
      }`}
    >
      {/* Channel Logo / Fallback Badge */}
      <div className="relative flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-zinc-950 border border-zinc-800 p-1.5 overflow-hidden group-hover:scale-105 transition-transform">
        {channel.logo && !logoFailed ? (
          <img
            src={channel.logo}
            alt={channel.name}
            onError={() => setLogoFailed(true)}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 text-xs font-black text-amber-500 tracking-wider">
            {initials}
          </div>
        )}

        {/* Playing indicator dot */}
        {isActive && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3
            className={`text-sm font-semibold truncate transition-colors ${
              isActive ? "text-amber-400" : "text-zinc-200 group-hover:text-white"
            }`}
          >
            {channel.name}
          </h3>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="rounded bg-zinc-800/90 px-1.5 py-0.5 font-medium text-zinc-300">
            {channel.group || "Live"}
          </span>

          {channel.country && (
            <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-zinc-400 uppercase font-mono text-[10px]">
              {channel.country}
            </span>
          )}

          {channel.quality && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
              {channel.quality}
            </span>
          )}

          {channel.isGeoBlocked && (
            <span className="text-[10px] text-zinc-500" title="Geo-blocked in some regions">
              [Geo]
            </span>
          )}
        </div>
      </div>

      {/* Favorite Toggle Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(channel.id);
        }}
        className={`p-2 rounded-lg transition-colors ${
          isFavorite
            ? "text-amber-400 hover:text-amber-300"
            : "text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 focus:opacity-100"
        }`}
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        aria-label={isFavorite ? "Remove favorite channel" : "Add favorite channel"}
      >
        <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-400" : ""}`} />
      </button>
    </div>
  );
}

