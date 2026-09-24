import React from "react";
import { MediaItem } from "@/types/media";
import { MediaCard } from "./MediaCard";
import { Rail } from "./Rail";

interface MediaRowProps {
  title: string;
  items: MediaItem[];
  viewAllHref?: string;
  /** Number of leading posters to load eagerly. Only the first above-the-fold row should set this. */
  priorityCount?: number;
  /** Renders a Top-10 style ranking numeral beside each poster. */
  ranked?: boolean;
}

const tileWidth = "w-[30vw] sm:w-[22vw] md:w-[17vw] lg:w-[14vw] xl:w-[12vw] 2xl:w-[10.5vw] max-w-[220px]";

export function MediaRow({ title, items, viewAllHref, priorityCount = 0, ranked = false }: MediaRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <Rail title={title} href={viewAllHref}>
      {items.map((item, idx) =>
        ranked ? (
          // Numeral bottom-aligns with the poster (mb = caption height under the poster).
          <li key={item.id} className="flex flex-shrink-0 snap-start items-end">
            <span
              className="-mr-[2%] mb-[46px] select-none text-[7rem] font-black leading-[0.74] tracking-tighter text-canvas sm:text-[10rem] lg:text-[12rem]"
              style={{ WebkitTextStroke: "3px rgb(255 255 255 / 0.35)" }}
              aria-hidden="true"
            >
              {idx + 1}
            </span>
            <div className={`relative ${tileWidth}`}>
              <span className="sr-only">Number {idx + 1}: </span>
              <MediaCard item={item} priority={idx < priorityCount} />
            </div>
          </li>
        ) : (
          <li key={item.id} className={`flex-shrink-0 snap-start ${tileWidth}`}>
            <MediaCard item={item} priority={idx < priorityCount} />
          </li>
        )
      )}
    </Rail>
  );
}
