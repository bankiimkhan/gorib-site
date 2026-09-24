import React from "react";
import { AdPlacement, PlaceholderMode } from "../types";
import { PLACEMENT_DIMENSIONS } from "../adConfig";

interface PlaceholderProviderProps {
  placement: AdPlacement;
  mode: PlaceholderMode;
  className?: string;
}

export function PlaceholderProvider({ placement, mode, className = "" }: PlaceholderProviderProps) {
  const dimensions = PLACEMENT_DIMENSIONS[placement] || PLACEMENT_DIMENSIONS["home-top"];

  if (mode === "minimal") {
    return (
      <div
        className={`flex w-full items-center justify-center rounded-md border border-dashed border-line bg-surface/20 p-2 text-center ${className}`}
        aria-label="Advertisement placeholder"
      >
        <span className="text-[10px] tracking-wider text-fg-subtle uppercase font-mono">
          Advertisement
        </span>
      </div>
    );
  }

  const isDebug = mode === "debug";

  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-line bg-surface/40 p-4 text-center transition-all ${className}`}
      aria-label={`Sponsored area for ${placement}`}
    >
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-transparent to-white/[0.02] pointer-events-none" />

      {/* Subtle top indicator */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle font-mono">
          Sponsored Area
        </span>
      </div>

      {isDebug ? (
        <div className="flex flex-col items-center gap-0.5 text-xs text-fg-muted">
          <p className="font-semibold text-fg-muted">
            Slot: <code className="text-white font-mono">{placement}</code>
          </p>
          <p className="text-[11px] text-fg-subtle font-mono">
            Desktop: {dimensions.desktop.width}×{dimensions.desktop.height} • Mobile: {dimensions.mobile.width}×{dimensions.mobile.height}
          </p>
          <span className="mt-1 text-[10px] text-fg-subtle">
            (Development Placeholder Mode: Set NEXT_PUBLIC_AD_PROVIDER to connect live ads)
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-fg-muted">
            Display Advertising Unit
          </span>
          <span className="text-[10px] text-fg-subtle font-mono">
            Placement: {placement} ({dimensions.desktop.width}×{dimensions.desktop.height})
          </span>
        </div>
      )}
    </div>
  );
}
