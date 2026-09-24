"use client";

import React from "react";
import { StreamSource } from "@/types/streaming";

interface ServerSelectorProps {
  sources: StreamSource[];
  activeSourceIndex: number;
  onSelectSource: (index: number) => void;
}

/** Server switcher below the player (embedded servers have no in-player menu). */
export function ServerSelector({ sources, activeSourceIndex, onSelectSource }: ServerSelectorProps) {
  if (!sources || sources.length <= 1) return null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
      <p className="text-sm text-fg-muted">
        <span className="font-semibold text-white">Server</span>
        <span className="hidden sm:inline"> · not playing? Try another.</span>
      </p>
      <div className="no-scrollbar -mx-[max(1rem,4vw)] flex min-w-0 gap-2 overflow-x-auto px-[max(1rem,4vw)] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Streaming server">
        {sources.map((src, index) => (
          <button
            key={`${src.url}-${index}`}
            type="button"
            onClick={() => onSelectSource(index)}
            aria-pressed={index === activeSourceIndex}
            className="chip h-9 px-4 text-sm"
          >
            {src.serverName || `Server ${index + 1}`}
            {src.quality && src.quality !== "auto" && <span className="text-[10px] font-bold opacity-60">{src.quality}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
