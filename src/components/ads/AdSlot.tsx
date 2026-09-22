import React from "react";

export type AdPlacement =
  | "home-top"
  | "home-feed"
  | "details"
  | "player-bottom"
  | "search";

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

/**
 * Configurable AdSlot Component.
 * Controlled by process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED.
 * When disabled (default), renders null with 0 layout shift.
 * When enabled, renders a styled placeholder ready for ad scripts (e.g. Google AdSense / Prebid).
 */
export function AdSlot({ placement, className = "" }: AdSlotProps) {
  const isEnabled = process.env.NEXT_PUBLIC_AD_SLOTS_ENABLED === "true";

  if (!isEnabled) {
    return null;
  }

  const dimensions = {
    "home-top": "h-24 max-w-5xl",
    "home-feed": "h-32 max-w-6xl",
    details: "h-28 max-w-4xl",
    "player-bottom": "h-20 max-w-5xl",
    search: "h-24 max-w-4xl",
  }[placement];

  return (
    <div
      data-ad-placement={placement}
      className={`mx-auto my-6 flex w-full items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-xs tracking-wider text-zinc-600 uppercase ${dimensions} ${className}`}
      aria-label={`Advertisement slot: ${placement}`}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="font-semibold text-zinc-500">Sponsored Area</span>
        <span className="text-[10px] text-zinc-700">Placement: {placement}</span>
      </div>
    </div>
  );
}

