"use client";

import React from "react";
import Link from "next/link";
import { Play, Clapperboard } from "lucide-react";
import { MediaItem } from "@/types/media";
import { WatchlistButton } from "@/components/common/WatchlistButton";
import { ShareButton } from "./ShareButton";

interface TitleActionsProps {
  item: MediaItem;
  playHref: string;
  playLabel?: string;
  hasTrailer?: boolean;
}

/** Details-page action bar: one dominant Play, then secondary controls. */
export function TitleActions({ item, playHref, playLabel = "Play", hasTrailer = false }: TitleActionsProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Link href={playHref} className="btn btn-primary btn-lg w-full sm:w-auto sm:min-w-40">
        <Play className="h-5 w-5 fill-black" aria-hidden="true" />
        {playLabel}
      </Link>
      <div className="flex items-center gap-3">
        {hasTrailer && (
          <a href="#trailer" className="btn btn-secondary btn-lg flex-1 sm:flex-none">
            <Clapperboard className="h-5 w-5" aria-hidden="true" />
            Trailer
          </a>
        )}
        <WatchlistButton item={item} className="h-11 w-11 sm:h-12 sm:w-12" />
        <ShareButton title={item.title} />
      </div>
    </div>
  );
}
