"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { Season } from "@/types/media";

interface SeasonSelectorProps {
  seasons: Season[];
  activeSeason: number;
  onSeasonChange: (seasonNumber: number) => void;
}

/** Native select styled as a dropdown button: accessible, and scales to shows with dozens of seasons. */
export function SeasonSelector({ seasons, activeSeason, onSeasonChange }: SeasonSelectorProps) {
  if (!seasons || seasons.length === 0) return null;

  const active = seasons.find((s) => s.seasonNumber === activeSeason);
  const label = (s: Season) => s.name || `Season ${s.seasonNumber}`;

  if (seasons.length === 1) {
    return (
      <p className="text-base font-semibold text-white">
        {label(seasons[0])}
        <span className="ml-2 text-sm font-normal text-fg-subtle">{seasons[0].episodeCount} episodes</span>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative inline-flex">
        <select
          value={activeSeason}
          onChange={(e) => onSeasonChange(Number(e.target.value))}
          aria-label="Season"
          className="h-11 cursor-pointer appearance-none rounded-md border border-line-strong bg-surface-2 pl-4 pr-10 text-base font-semibold text-white transition-colors hover:bg-surface-3"
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.seasonNumber} className="bg-surface text-white">
              {label(season)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white" aria-hidden="true" />
      </div>
      {active && <span className="text-sm text-fg-subtle">{active.episodeCount} episodes</span>}
    </div>
  );
}
