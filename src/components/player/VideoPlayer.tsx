"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  SkipForward,
  Server,
  Download,
} from "lucide-react";
import { StreamSource } from "@/types/streaming";
import { formatPlayerTime } from "@/lib/utils/formatters";

interface VideoPlayerProps {
  title: string;
  sources: StreamSource[];
  poster?: string;
  initialTime?: number;
  activeSourceIndex?: number;
  onSourceChange?: (index: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  nextEpisodeUrl?: string;
  isLive?: boolean;
}

export function VideoPlayer({
  title,
  sources,
  poster,
  initialTime = 0,
  activeSourceIndex: externalIndex,
  onSourceChange,
  onTimeUpdate,
  onEnded,
  nextEpisodeUrl,
  isLive = false,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const serverMenuRef = useRef<HTMLDivElement>(null);

  const [internalSourceIndex, setInternalSourceIndex] = useState(0);
  const activeSourceIndex = externalIndex !== undefined ? externalIndex : internalSourceIndex;

  const currentSource: StreamSource | undefined = sources[activeSourceIndex] || sources[0];

  const handleSelectSource = (newIndex: number) => {
    setHasError(false);
    setErrorMessage("");
    if (onSourceChange) {
      onSourceChange(newIndex);
    } else {
      setInternalSourceIndex(newIndex);
    }
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);

  // Settings
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [hlsLevels, setHlsLevels] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [activeQuality, setActiveQuality] = useState<number>(-1); // -1 is Auto
  const activeSubtitle = -1; // -1 is Off

  const isLiveStream = isLive || (duration > 0 && !isFinite(duration)) || duration === Infinity;

  // Video initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSource || currentSource.format === "iframe") return;

    setIsBuffering(true);
    setHasError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = currentSource.url;

    if (currentSource.format === "hls" || streamUrl.includes(".m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          setIsBuffering(false);
          const levels = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height,
            bitrate: lvl.bitrate,
          }));
          setHlsLevels(levels);

          if (initialTime > 0) {
            video.currentTime = initialTime;
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setHasError(true);
                setErrorMessage("Unable to play stream from current server.");
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        if (initialTime > 0) {
          video.currentTime = initialTime;
        }
      } else {
        setHasError(true);
        setErrorMessage("HLS playback is not supported on this browser.");
      }
    } else {
      // Standard video file
      video.src = streamUrl;
      if (initialTime > 0) {
        video.currentTime = initialTime;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentSource, activeSourceIndex, initialTime]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleWaiting = () => setIsBuffering(true);
  const handlePlaying = () => setIsBuffering(false);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (onTimeUpdate && video.duration > 0) {
      onTimeUpdate(video.currentTime, video.duration);
    }

    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBuffered((bufferedEnd / video.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setIsBuffering(false);
  };

  const handleVideoError = () => {
    console.error("[Player] Video tag error encountered on", currentSource?.url);
    setHasError(true);
    const isBDIX = currentSource?.url.includes("172.16.") || currentSource?.url.endsWith(".mkv");
    if (isBDIX) {
      setErrorMessage("This BDIX file uses MKV/HEVC encoding which your browser cannot decode natively.");
    } else {
      setErrorMessage("Unable to load video stream from available servers.");
    }
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video && !isNaN(target)) {
      video.currentTime = target;
      setCurrentTime(target);
    }
  };

  const seekRelative = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    }
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume > 0 ? volume : 0.5;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume, setIsMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const setQuality = (levelIndex: number) => {
    setActiveQuality(levelIndex);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    setShowSettings(false);
  };

  const setSpeed = (spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
    setShowSettings(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          seekRelative(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          seekRelative(10);
          break;
        case "arrowup":
          e.preventDefault();
          if (videoRef.current) {
            const nextVol = Math.min(1, videoRef.current.volume + 0.1);
            videoRef.current.volume = nextVol;
            setVolume(nextVol);
            setIsMuted(false);
          }
          break;
        case "arrowdown":
          e.preventDefault();
          if (videoRef.current) {
            const nextVol = Math.max(0, videoRef.current.volume - 0.1);
            videoRef.current.volume = nextVol;
            setVolume(nextVol);
            setIsMuted(nextVol === 0);
          }
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "escape":
          setShowSettings(false);
          setShowServerMenu(false);
          setShowHelp(false);
          break;
        case "?":
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seekRelative, toggleFullscreen, toggleMute]);

  // Click outside listener for settings and server menus
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showSettings &&
        settingsRef.current &&
        !settingsRef.current.contains(target)
      ) {
        setShowSettings(false);
      }
      if (
        showServerMenu &&
        serverMenuRef.current &&
        !serverMenuRef.current.contains(target)
      ) {
        setShowServerMenu(false);
      }
    };

    if (showSettings || showServerMenu) {
      document.addEventListener("mousedown", handleDocumentClick);
      return () => document.removeEventListener("mousedown", handleDocumentClick);
    }
  }, [showSettings, showServerMenu]);

  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying && !showSettings && !showHelp && !showServerMenu) {
        setControlsVisible(false);
      }
    }, 3000);
  };

  if (currentSource?.format === "iframe") {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
        <iframe
          src={currentSource.url}
          title={title}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  const isCurrentBDIX =
    currentSource?.url.includes("172.16.") || currentSource?.url.endsWith(".mkv");

  return (
    <div
      ref={containerRef}
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
      className={`group relative aspect-video w-full overflow-hidden rounded-2xl bg-black select-none ${
        isFullscreen ? "h-screen w-screen rounded-none" : "shadow-2xl ring-1 ring-white/10"
      }`}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        onEnded={onEnded}
        onClick={togglePlay}
        className="h-full w-full object-contain cursor-pointer"
      >
        {currentSource?.subtitles?.map((sub, i) => (
          <track
            key={i}
            label={sub.label}
            kind="subtitles"
            srcLang={sub.language}
            src={sub.url}
            default={sub.default || i === activeSubtitle}
          />
        ))}
      </video>

      {/* Buffering Indicator */}
      {isBuffering && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-zinc-300">Loading stream...</span>
          </div>
        </div>
      )}

      {/* Error Overlay with Smart BDIX Handling */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center backdrop-blur-md z-40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {isCurrentBDIX ? "Local BDIX MKV Codec Notice" : "Playback Unavailable"}
          </h3>
          <p className="max-w-md text-xs sm:text-sm text-zinc-400 mb-6 leading-relaxed">
            {isCurrentBDIX
              ? "This high-speed BDIX title uses 1080p HEVC (MKV) encoding which web browsers cannot decode in-browser. You can launch it in VLC Player at 100 Mbps or switch to Server 1 for in-browser streaming."
              : errorMessage || "Unable to play this title right now."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isCurrentBDIX && (
              <a
                href={`vlc://${currentSource?.url}`}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                <Play className="h-4 w-4 fill-black" />
                <span>Open in VLC (100 Mbps)</span>
              </a>
            )}

            <button
              onClick={() => {
                setHasError(false);
                handleSelectSource(0); // Switch to Server 1
              }}
              className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Switch to Server 1 (In-Browser)</span>
            </button>

            {isCurrentBDIX && (
              <a
                href={currentSource?.url}
                download
                className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors border border-zinc-800"
              >
                <Download className="h-4 w-4" />
                <span>Direct Download</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Top Title Bar */}
      <div
        className={`pointer-events-none absolute top-0 left-0 right-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 sm:p-6 transition-opacity duration-300 ${
          controlsVisible && !hasError ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-white drop-shadow truncate max-w-md">
            {title}
          </h2>
          {isLiveStream && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-600/30 px-2.5 py-0.5 text-[11px] font-bold text-red-400 border border-red-500/40 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              LIVE
            </span>
          )}
          {currentSource?.serverName && (
            <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-zinc-700">
              {currentSource.serverName}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowHelp((prev) => !prev)}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-zinc-400 hover:text-white border border-zinc-700 hover:bg-zinc-800 transition-colors"
          title="Keyboard Shortcuts (?)"
          aria-label="View keyboard shortcuts"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 sm:p-6 transition-opacity duration-300 ${
          controlsVisible && !hasError ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrub Bar */}
        {!isLiveStream ? (
          <div className="relative mb-3 flex items-center group/scrub">
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-zinc-700/60 transition-all"
              style={{ width: `${buffered}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 appearance-none bg-zinc-800/80 rounded-full cursor-pointer accent-amber-500 hover:h-2 transition-all focus:outline-none"
              aria-label="Seek video slider"
            />
          </div>
        ) : (
          <div className="relative mb-3 flex items-center h-1 bg-zinc-800/60 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-600 to-amber-500 w-full animate-pulse" />
          </div>
        )}

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-black hover:bg-amber-400 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-black" /> : <Play className="h-5 w-5 fill-black ml-0.5" />}
            </button>

            {!isLiveStream && (
              <>
                <button
                  type="button"
                  onClick={() => seekRelative(-10)}
                  className="text-zinc-300 hover:text-white transition-colors"
                  title="Rewind 10s (Left Arrow)"
                  aria-label="Rewind 10 seconds"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => seekRelative(10)}
                  className="text-zinc-300 hover:text-white transition-colors"
                  title="Fast Forward 10s (Right Arrow)"
                  aria-label="Fast forward 10 seconds"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Volume */}
            <div className="flex items-center gap-2 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="text-zinc-300 hover:text-white transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5 text-red-400" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-24 h-1 appearance-none bg-zinc-700 rounded-full cursor-pointer accent-amber-500 focus:outline-none"
                aria-label="Volume slider"
              />
            </div>

            {/* Time or Live Status */}
            {isLiveStream ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-600/20 border border-red-500/30 text-red-400 font-bold text-[11px] uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                <span>LIVE</span>
              </div>
            ) : (
              <div className="text-xs font-medium text-zinc-400">
                <span className="text-zinc-200">{formatPlayerTime(currentTime)}</span>
                <span className="mx-1">/</span>
                <span>{formatPlayerTime(duration)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {nextEpisodeUrl && (
              <Link
                href={nextEpisodeUrl}
                className="hidden sm:flex items-center gap-1.5 rounded-lg bg-zinc-800/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors"
                title="Play Next Episode"
              >
                <SkipForward className="h-3.5 w-3.5" />
                <span>Next Ep</span>
              </Link>
            )}

            {/* In-player Server Menu Toggle */}
            {sources.length > 1 && (
              <div ref={serverMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowServerMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
                  title="Switch streaming server"
                >
                  <Server className="h-3.5 w-3.5 text-amber-500" />
                  <span>{currentSource?.serverName?.split("(")[0]?.trim() || `Server ${activeSourceIndex + 1}`}</span>
                </button>

                {showServerMenu && (
                  <div className="absolute right-0 bottom-12 w-64 rounded-xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-xl z-50 text-xs">
                    <div className="border-b border-zinc-800 pb-1.5 mb-1.5 font-bold text-white uppercase tracking-wider text-[10px]">
                      Select Server
                    </div>
                    {sources.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSelectSource(idx);
                          setShowServerMenu(false);
                        }}
                        className={`w-full rounded-lg px-2.5 py-2 text-left flex items-center justify-between mb-1 ${
                          activeSourceIndex === idx
                            ? "bg-amber-500 text-black font-bold"
                            : "text-zinc-300 hover:bg-zinc-900"
                        }`}
                      >
                        <span className="truncate">{s.serverName || `Server ${idx + 1}`}</span>
                        <span className="text-[10px] uppercase font-semibold opacity-75">{s.quality}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Trigger */}
            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => setShowSettings((prev) => !prev)}
                className={`p-2 rounded-full transition-colors ${
                  showSettings ? "bg-amber-500 text-black" : "text-zinc-300 hover:text-white"
                }`}
                title="Settings"
                aria-label="Playback settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              {showSettings && (
                <div className="absolute right-0 bottom-12 w-56 rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl z-50 text-xs">
                  <div className="border-b border-zinc-800 pb-2 mb-2 font-bold text-white uppercase tracking-wider text-[10px]">
                    Playback Options
                  </div>

                  {hlsLevels.length > 0 && (
                    <div className="mb-3">
                      <div className="text-zinc-400 font-medium mb-1.5">Quality</div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => setQuality(-1)}
                          className={`rounded px-2 py-1 text-left ${
                            activeQuality === -1 ? "bg-amber-500/20 text-amber-400 font-bold" : "text-zinc-300 hover:bg-zinc-900"
                          }`}
                        >
                          Auto
                        </button>
                        {hlsLevels.map((lvl) => (
                          <button
                            key={lvl.id}
                            onClick={() => setQuality(lvl.id)}
                            className={`rounded px-2 py-1 text-left ${
                              activeQuality === lvl.id ? "bg-amber-500/20 text-amber-400 font-bold" : "text-zinc-300 hover:bg-zinc-900"
                            }`}
                          >
                            {lvl.height}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-zinc-400 font-medium mb-1.5">Playback Speed</div>
                    <div className="grid grid-cols-3 gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setSpeed(spd)}
                          className={`rounded px-2 py-1 text-center ${
                            playbackSpeed === spd ? "bg-amber-500/20 text-amber-400 font-bold" : "text-zinc-300 hover:bg-zinc-900"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-zinc-300 hover:text-white transition-colors"
              aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-white">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-400" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2 text-xs text-zinc-300">
              <div className="flex justify-between">
                <span>Space / K</span>
                <span className="font-semibold text-zinc-400">Play / Pause</span>
              </div>
              <div className="flex justify-between">
                <span>Left / Right Arrow</span>
                <span className="font-semibold text-zinc-400">Seek ±10 seconds</span>
              </div>
              <div className="flex justify-between">
                <span>Up / Down Arrow</span>
                <span className="font-semibold text-zinc-400">Volume ±10%</span>
              </div>
              <div className="flex justify-between">
                <span>M</span>
                <span className="font-semibold text-zinc-400">Mute / Unmute</span>
              </div>
              <div className="flex justify-between">
                <span>F</span>
                <span className="font-semibold text-zinc-400">Toggle Fullscreen</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full rounded-xl bg-amber-500 py-2 text-xs font-bold text-black hover:bg-amber-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
