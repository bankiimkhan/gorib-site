"use client";

import React, { useState } from "react";
import { Server, Cloud, Zap, ExternalLink, Check, Copy } from "lucide-react";
import { StreamSource } from "@/types/streaming";

interface ServerSelectorProps {
  sources: StreamSource[];
  activeSourceIndex: number;
  onSelectSource: (index: number) => void;
}

export function ServerSelector({
  sources,
  activeSourceIndex,
  onSelectSource,
}: ServerSelectorProps) {
  const [copied, setCopied] = useState(false);

  if (!sources || sources.length === 0) return null;

  const currentSource = sources[activeSourceIndex] || sources[0];
  const isLocalBDIX =
    currentSource?.url.includes("172.16.") ||
    currentSource?.serverName?.toLowerCase().includes("dhakaflix") ||
    currentSource?.serverName?.toLowerCase().includes("bdix");

  const isMKV = currentSource?.url.endsWith(".mkv");

  const handleCopyLink = () => {
    if (currentSource?.url) {
      navigator.clipboard.writeText(currentSource.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-xl backdrop-blur-md">
      {/* Top Row: Server Switcher Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
            Streaming Servers:
          </span>
        </div>

        {/* Server Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {sources.map((src, index) => {
            const isActive = index === activeSourceIndex;
            const isBDIX =
              src.url.includes("172.16.") ||
              src.serverName?.toLowerCase().includes("bdix") ||
              src.serverName?.toLowerCase().includes("dhakaflix");

            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectSource(index)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25 scale-[1.02] ring-2 ring-amber-400/50"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                }`}
              >
                {isBDIX ? (
                  <Zap className={`h-3.5 w-3.5 ${isActive ? "fill-black" : "text-amber-400"}`} />
                ) : (
                  <Cloud className={`h-3.5 w-3.5 ${isActive ? "fill-black" : "text-cyan-400"}`} />
                )}
                <span>{src.serverName || `Server ${index + 1}`}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {src.quality || "HD"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-strip for Local BDIX / MKV options */}
      {isLocalBDIX && (
        <div className="mt-3.5 pt-3.5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Connected to <strong>DhakaFlix BDIX Local LAN</strong> (up to 100 Mbps).
              {isMKV && " (File format: MKV / HEVC)"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Open in VLC */}
            <a
              href={`vlc://${currentSource.url}`}
              className="flex items-center gap-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 px-3 py-1.5 font-bold text-orange-400 hover:bg-orange-500 hover:text-black transition-colors"
              title="Launch directly in VLC Media Player"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Play in VLC</span>
            </a>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700"
              title="Copy stream URL"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

