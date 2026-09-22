"use client";

import React from "react";
import { Season } from "@/types/media";

interface SeasonSelectorProps {
  seasons: Season[];
  activeSeason: number;
  onSeasonChange: (seasonNumber: number) => void;
}

export function SeasonSelector({
  seasons,
  activeSeason,
  onSeasonChange,
}: SeasonSelectorProps) {
  if (!seasons || seasons.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mr-2">
        Seasons:
      </span>
      {seasons.map((season) => {
        const isActive = season.seasonNumber === activeSeason;
        return (
          <button
            key={season.id}
            type="button"
            onClick={() => onSeasonChange(season.seasonNumber)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              isActive
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
            }`}
          >
            {season.name || `Season ${season.seasonNumber}`}
          </button>
        );
      })}
    </div>
  );
}

