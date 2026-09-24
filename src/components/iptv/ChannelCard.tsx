"use client";

import React, { useState } from "react";
import { IPTVChannel } from "@/types/iptv";
import { Star } from "lucide-react";

interface ChannelCardProps {
  channel: IPTVChannel;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: (channel: IPTVChannel) => void;
  onToggleFavorite: (channelId: string) => void;
}

export function ChannelCard({ channel, isActive, isFavorite, onSelect, onToggleFavorite }: ChannelCardProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  const initials =
    channel.name
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "TV";

  return (
    <div
      className={`group relative flex items-center rounded-md border transition-colors ${
        isActive ? "border-white/60 bg-surface-2" : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(channel)}
        aria-current={isActive ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-md p-3 text-left"
      >
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-black p-1.5">
          {channel.logo && !logoFailed ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={channel.logo}
              alt=""
              onError={() => setLogoFailed(true)}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <span className="text-xs font-black tracking-wider text-fg-muted">{initials}</span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-fg">{channel.name}</span>
            {isActive && (
              <span className="flex flex-shrink-0 items-center gap-1 rounded bg-accent px-1.5 py-px text-[10px] font-bold uppercase text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                Playing
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
            <span>{channel.group || "Live"}</span>
            {channel.country && <span className="uppercase">{channel.country}</span>}
            {channel.quality && <span className="font-semibold text-fg-muted">{channel.quality}</span>}
            {channel.isGeoBlocked && <span title="Geo-blocked in some regions">Geo-limited</span>}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => onToggleFavorite(channel.id)}
        aria-pressed={isFavorite}
        className={`mr-1.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-[color,opacity] ${
          isFavorite
            ? "text-rating"
            : "text-fg-subtle hover:text-white pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100"
        }`}
        aria-label={isFavorite ? `Remove ${channel.name} from favorites` : `Add ${channel.name} to favorites`}
      >
        <Star className={`h-4 w-4 ${isFavorite ? "fill-rating" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}
