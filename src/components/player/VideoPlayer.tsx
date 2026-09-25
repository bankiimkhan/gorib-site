"use client";

import React, { useRef, useState, useEffect, useCallback, useSyncExternalStore } from "react";
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
  Keyboard,
  AlertCircle,
  RefreshCw,
  SkipForward,
  Server,
  Subtitles,
  Check,
} from "lucide-react";
import { StreamSource, SubtitleTrack, AudioTrack } from "@/types/streaming";
import { formatPlayerTime } from "@/lib/utils/formatters";
import {
  deduplicateSubtitleTracks,
  deduplicateAudioTracks,
  normalizeLanguageCode,
  formatSubtitleLabel,
  formatAudioLabel,
} from "@/lib/utils/languages";
import { useLanguagePreferences } from "@/lib/hooks/useLanguagePreferences";

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

/** Elements that must keep their own Space/Enter behaviour. */
function isInteractiveTarget(el: Element | null): boolean {
  return Boolean(el?.closest("input, textarea, select, button, a, [contenteditable='true'], [role='option']"));
}

/** Subtitles and audio options offered by the current source, plus other-language servers. */
function deriveSourceTracks(
  currentSource: StreamSource | undefined,
  sources: StreamSource[],
  activeSourceIndex: number
): { subtitles: SubtitleTrack[]; audio: AudioTrack[] } {
  const subtitles = deduplicateSubtitleTracks(currentSource?.subtitles || []);

  const tracks: AudioTrack[] = [];
  if (currentSource?.audioTracks && currentSource.audioTracks.length > 0) {
    tracks.push(...currentSource.audioTracks);
  } else if (currentSource?.language) {
    tracks.push({
      id: `audio-src-${activeSourceIndex}`,
      label: formatAudioLabel({ language: currentSource.language, isOriginal: true }),
      language: currentSource.language,
      default: true,
      sourceIndex: activeSourceIndex,
    });
  }

  // Include alternative language streams from other sources
  sources.forEach((s, idx) => {
    if (idx !== activeSourceIndex && s.language && s.language !== currentSource?.language) {
      tracks.push({
        id: `audio-server-${idx}`,
        label: formatAudioLabel({
          label: s.serverName,
          language: s.language,
          isDub: s.serverName?.toLowerCase().includes("dub"),
        }),
        language: s.language,
        sourceIndex: idx,
      });
    }
  });

  const audio = deduplicateAudioTracks(tracks);
  if (audio.length === 0) {
    audio.push({ id: "audio-default", label: "Default", language: "en", default: true });
  }
  return { subtitles, audio };
}

const noopSubscribe = () => () => {};

const menuItem = (selected: boolean) =>
  `flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm transition-colors ${
    selected ? "font-semibold text-white" : "text-fg-muted hover:bg-white/10 hover:text-white"
  }`;

const controlButton =
  "flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition-[color,transform] hover:scale-110 hover:text-white";

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
  const audioSubsRef = useRef<HTMLDivElement>(null);

  const [internalSourceIndex, setInternalSourceIndex] = useState(0);
  const activeSourceIndex = externalIndex !== undefined ? externalIndex : internalSourceIndex;

  const currentSource: StreamSource | undefined = sources[activeSourceIndex] || sources[0];
  const isEmbed = currentSource?.format === "iframe";

  // Bumped by "Retry" to reload the same source.
  const [reloadKey, setReloadKey] = useState(0);

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
  const [showAudioSubsMenu, setShowAudioSubsMenu] = useState(false);

  const handleSelectSource = (newIndex: number) => {
    setHasError(false);
    setErrorMessage("");
    if (onSourceChange) {
      onSourceChange(newIndex);
    } else {
      setInternalSourceIndex(newIndex);
    }
  };

  // Settings
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [hlsLevels, setHlsLevels] = useState<{ id: number; height: number; bitrate: number }[]>([]);
  const [activeQuality, setActiveQuality] = useState<number>(-1); // -1 is Auto

  // Language Preferences & Dynamic Tracks
  const {
    matchPreferredSubtitle,
    matchPreferredAudio,
    setPreferredSubtitle,
    setPreferredAudio,
  } = useLanguagePreferences();

  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(-1); // -1 is Off
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>([]);
  const [activeAudioTrackIndex, setActiveAudioTrackIndex] = useState<number>(0);
  const [availableAudioTracks, setAvailableAudioTracks] = useState<AudioTrack[]>([]);

  // Re-derive tracks when the source changes, and once after hydration so
  // stored language preferences apply (render-time adjustment, not an effect).
  // Picking a track must not reset tracks discovered from the HLS manifest.
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [trackInputs, setTrackInputs] = useState<{ source?: StreamSource; sources: StreamSource[]; hydrated: boolean } | null>(null);
  if (
    !trackInputs ||
    trackInputs.source !== currentSource ||
    trackInputs.sources !== sources ||
    trackInputs.hydrated !== hydrated
  ) {
    setTrackInputs({ source: currentSource, sources, hydrated });
    const { subtitles, audio } = deriveSourceTracks(currentSource, sources, activeSourceIndex);
    setAvailableSubtitles(subtitles);
    setActiveSubtitleIndex(matchPreferredSubtitle(subtitles));
    setAvailableAudioTracks(audio);
    setActiveAudioTrackIndex(matchPreferredAudio(audio));
  }

  // Synchronize text tracks mode without interrupting playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = i === activeSubtitleIndex ? "showing" : "disabled";
    }
  }, [activeSubtitleIndex, availableSubtitles]);

  const isLiveStream = isLive || (duration > 0 && !isFinite(duration)) || duration === Infinity;

  // A dead live source falls through to the next one (e.g. Direct -> Proxy) before showing an error.
  const failSource = (message: string) => {
    if (isLive && activeSourceIndex < sources.length - 1) {
      handleSelectSource(activeSourceIndex + 1);
      return;
    }
    setHasError(true);
    setErrorMessage(message);
  };

  // Video initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSource || currentSource.format === "iframe") return;

    setIsBuffering(true);
    setHasError(false);
    let networkRecoveries = 0;

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
          setHlsLevels(
            data.levels.map((lvl, index) => ({
              id: index,
              height: lvl.height,
              bitrate: lvl.bitrate,
            }))
          );
          if (initialTime > 0) {
            video.currentTime = initialTime;
          }
        });

        // Detect HLS Manifest Audio Tracks dynamically
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
          if (data.audioTracks && data.audioTracks.length > 0) {
            const hlsAudio: AudioTrack[] = data.audioTracks.map((trk, i) => ({
              id: i,
              label: formatAudioLabel({ label: trk.name, language: trk.lang }),
              language: normalizeLanguageCode(trk.lang || "en"),
              default: Boolean(trk.default),
            }));
            const dedupedHlsAudio = deduplicateAudioTracks(hlsAudio);
            setAvailableAudioTracks(dedupedHlsAudio);
            const matchedIdx = matchPreferredAudio(dedupedHlsAudio);
            setActiveAudioTrackIndex(matchedIdx);
            if (hls.audioTrack !== matchedIdx) {
              hls.audioTrack = matchedIdx;
            }
          }
        });

        // Detect HLS Manifest Subtitle Tracks dynamically
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
          if (data.subtitleTracks && data.subtitleTracks.length > 0) {
            const hlsSubs: SubtitleTrack[] = data.subtitleTracks.map((trk) => ({
              label: formatSubtitleLabel({ label: trk.name, language: trk.lang }),
              language: normalizeLanguageCode(trk.lang || "en"),
              url: "",
              default: Boolean(trk.default),
            }));
            const combined = deduplicateSubtitleTracks([...(currentSource?.subtitles || []), ...hlsSubs]);
            setAvailableSubtitles(combined);
            const matchedSubIdx = matchPreferredSubtitle(combined);
            setActiveSubtitleIndex(matchedSubIdx);
            if (matchedSubIdx !== -1) {
              hls.subtitleTrack = matchedSubIdx;
            }
          }
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          setActiveAudioTrackIndex(data.id);
        });

        hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
          setActiveSubtitleIndex(data.id);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Unbounded retries leave a dead stream spinning forever, and startLoad()
                // can't recover a manifest that never loaded, so that fails straight away.
                if (hls.levels.length > 0 && networkRecoveries < 3) {
                  networkRecoveries++;
                  hls.startLoad();
                  break;
                }
                hls.destroy();
                hlsRef.current = null;
                failSource("This stream isn't responding.");
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                hlsRef.current = null;
                failSource("This server couldn't play the stream.");
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
        setErrorMessage("This browser can't play HLS streams.");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSource, activeSourceIndex, initialTime, reloadKey]);

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
    autoplayLive();
  };

  const handleVideoError = () => {
    console.error("[Player] Video error on", currentSource?.url);
    failSource("This server couldn't load the video.");
  };

  // Live channels should start on selection. Browsers may refuse unmuted
  // autoplay, so fall back to muted playback rather than a frozen frame.
  const autoplayLive = () => {
    const video = videoRef.current;
    if (!video || !isLive || !video.paused) return;
    video.play().catch((err: unknown) => {
      if (!(err instanceof DOMException) || err.name !== "NotAllowedError") return;
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {});
    });
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
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
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

  const handleSelectSubtitle = useCallback(
    (trackIndex: number) => {
      setActiveSubtitleIndex(trackIndex);
      if (trackIndex === -1) {
        if (hlsRef.current) {
          hlsRef.current.subtitleTrack = -1;
        }
        if (videoRef.current && videoRef.current.textTracks) {
          for (let i = 0; i < videoRef.current.textTracks.length; i++) {
            videoRef.current.textTracks[i].mode = "disabled";
          }
        }
        setPreferredSubtitle("off");
      } else {
        const selectedTrack = availableSubtitles[trackIndex];
        if (selectedTrack) {
          if (hlsRef.current && !selectedTrack.url) {
            hlsRef.current.subtitleTrack = trackIndex;
          }
          if (videoRef.current && videoRef.current.textTracks) {
            for (let i = 0; i < videoRef.current.textTracks.length; i++) {
              videoRef.current.textTracks[i].mode = i === trackIndex ? "showing" : "disabled";
            }
          }
          setPreferredSubtitle(selectedTrack.language);
        }
      }
      setShowAudioSubsMenu(false);
    },
    [availableSubtitles, setPreferredSubtitle]
  );

  const handleSelectAudio = (trackIndex: number) => {
    setActiveAudioTrackIndex(trackIndex);
    const selectedTrack = availableAudioTracks[trackIndex];
    if (selectedTrack) {
      if (hlsRef.current && selectedTrack.sourceIndex === undefined) {
        hlsRef.current.audioTrack = trackIndex;
      } else if (selectedTrack.sourceIndex !== undefined && selectedTrack.sourceIndex !== activeSourceIndex) {
        handleSelectSource(selectedTrack.sourceIndex);
      }
      setPreferredAudio(selectedTrack.language);
    }
    setShowAudioSubsMenu(false);
  };

  const closeMenus = () => {
    setShowSettings(false);
    setShowServerMenu(false);
    setShowAudioSubsMenu(false);
  };

  // Keyboard shortcuts (native player only; embeds handle their own keys).
  useEffect(() => {
    if (isEmbed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      const active = document.activeElement;
      // Let focused controls (buttons, links, sliders, fields) keep their own keys.
      if (isInteractiveTarget(active) && (key === " " || key === "enter" || active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
        return;
      }

      switch (key) {
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
        case "c":
          e.preventDefault();
          if (availableSubtitles.length > 0) {
            handleSelectSubtitle(activeSubtitleIndex === -1 ? 0 : -1);
          }
          break;
        case "escape":
          closeMenus();
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
  }, [isEmbed, togglePlay, seekRelative, toggleFullscreen, toggleMute, availableSubtitles, activeSubtitleIndex, handleSelectSubtitle]);

  // Click outside listener for settings, server, and audio/subtitle menus
  useEffect(() => {
    if (!showSettings && !showServerMenu && !showAudioSubsMenu) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showSettings && !settingsRef.current?.contains(target)) setShowSettings(false);
      if (showServerMenu && !serverMenuRef.current?.contains(target)) setShowServerMenu(false);
      if (showAudioSubsMenu && !audioSubsRef.current?.contains(target)) setShowAudioSubsMenu(false);
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [showSettings, showServerMenu, showAudioSubsMenu]);

  const anyMenuOpen = showSettings || showServerMenu || showAudioSubsMenu || showHelp;

  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      // Read live state: the closure's isPlaying may be stale.
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, []);

  if (isEmbed && currentSource) {
    return (
      <div
        ref={containerRef}
        className={`group relative aspect-video w-full overflow-hidden bg-black ${
          isFullscreen ? "h-screen w-screen" : "sm:rounded-lg"
        }`}
      >
        <iframe
          key={currentSource.url}
          src={currentSource.url}
          title={`${title} player`}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="origin"
          className="h-full w-full border-0"
        />
        {/* Some embeds (e.g. MultiEmbed) ship a broken fullscreen button, so fullscreen our wrapper instead. */}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          className="absolute right-3 top-3 z-10 rounded-md bg-black/60 p-2 text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
        >
          {isFullscreen ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Maximize className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
    );
  }

  const nextServerIndex = sources.length > 1 ? (activeSourceIndex + 1) % sources.length : -1;
  const controlsShown = (controlsVisible || !isPlaying || anyMenuOpen) && !hasError;
  const serverLabel = currentSource?.serverName?.split("(")[0]?.trim() || `Server ${activeSourceIndex + 1}`;

  return (
    <div
      ref={containerRef}
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
      onFocusCapture={showControlsTemporarily}
      className={`group relative aspect-video w-full select-none overflow-hidden bg-black ${
        isFullscreen ? "h-screen w-screen" : "sm:rounded-lg"
      } ${controlsShown ? "" : "cursor-none"}`}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        onEnded={onEnded}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="h-full w-full cursor-pointer object-contain"
      >
        {availableSubtitles.map((sub, i) => {
          if (!sub.url) return null;
          return (
            <track
              key={`${sub.language}-${i}-${sub.url}`}
              label={sub.label}
              kind="subtitles"
              srcLang={sub.language}
              src={sub.url}
              default={i === activeSubtitleIndex}
            />
          );
        })}
      </video>

      {/* Buffering */}
      {isBuffering && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-white/20 border-t-accent" />
          <span className="sr-only">Loading video</span>
        </div>
      )}

      {/* Large centre play when paused */}
      {!isPlaying && !isBuffering && !hasError && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-110 sm:h-20 sm:w-20"
          aria-label="Play"
        >
          <Play className="ml-1 h-8 w-8 fill-white sm:h-10 sm:w-10" aria-hidden="true" />
        </button>
      )}

      {/* Error */}
      {hasError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 p-6 text-center" role="alert">
          <AlertCircle className="mb-3 h-10 w-10 text-fg-muted" strokeWidth={1.5} aria-hidden="true" />
          <h3 className="text-lg font-bold text-white">Playback problem</h3>
          <p className="mt-1.5 max-w-md text-sm text-fg-muted">
            {errorMessage || "This title can't be played right now."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {nextServerIndex >= 0 && (
              <button type="button" onClick={() => handleSelectSource(nextServerIndex)} className="btn btn-primary">
                <Server className="h-4 w-4" aria-hidden="true" />
                Try another server
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setHasError(false);
                setReloadKey((k) => k + 1);
              }}
              className="btn btn-secondary"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent p-3 transition-opacity duration-300 sm:p-5 ${
          controlsShown ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="truncate text-sm font-semibold text-white sm:text-base">{title}</h2>
          {isLiveStream && (
            <span className="flex flex-shrink-0 items-center gap-1.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
              Live
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((prev) => !prev)}
          className="pointer-events-auto hidden h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white sm:flex"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2 pt-12 transition-opacity duration-300 sm:px-5 sm:pb-4 ${
          controlsShown ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Scrub bar */}
        {!isLiveStream ? (
          <div className="group/scrub relative flex h-4 items-center">
            <div className="pointer-events-none absolute inset-x-0 h-1 rounded-full bg-white/20 transition-[height] group-hover/scrub:h-1.5">
              <div className="h-full rounded-full bg-white/30" style={{ width: `${buffered}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="relative h-1 w-full cursor-pointer appearance-none bg-transparent accent-accent"
              aria-label="Seek"
              aria-valuetext={`${formatPlayerTime(currentTime)} of ${formatPlayerTime(duration)}`}
            />
          </div>
        ) : (
          <div className="flex h-4 items-center">
            <div className="h-1 w-full rounded-full bg-accent" />
          </div>
        )}

        <div className="mt-1 flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-0.5 sm:gap-1.5">
            <button type="button" onClick={togglePlay} className={controlButton} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause className="h-6 w-6 fill-white" aria-hidden="true" /> : <Play className="h-6 w-6 fill-white" aria-hidden="true" />}
            </button>

            {!isLiveStream && (
              <>
                <button type="button" onClick={() => seekRelative(-10)} className={controlButton} aria-label="Back 10 seconds">
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => seekRelative(10)} className={controlButton} aria-label="Forward 10 seconds">
                  <RotateCw className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            )}

            <div className="group/vol flex items-center">
              <button type="button" onClick={toggleMute} className={controlButton} aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="hidden h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 accent-white transition-[width] duration-200 focus:w-20 group-hover/vol:w-20 sm:block"
                aria-label="Volume"
              />
            </div>

            {isLiveStream ? (
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-accent">Live</span>
            ) : (
              <span className="ml-2 text-xs tabular-nums text-white/80 sm:text-sm">
                {formatPlayerTime(currentTime)} <span className="text-white/40">/</span> {formatPlayerTime(duration)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1.5">
            {nextEpisodeUrl && (
              <Link href={nextEpisodeUrl} className={controlButton} aria-label="Next episode" title="Next episode">
                <SkipForward className="h-5 w-5 fill-white" aria-hidden="true" />
              </Link>
            )}

            {sources.length > 1 && (
              <div ref={serverMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowServerMenu((prev) => !prev);
                    setShowSettings(false);
                    setShowAudioSubsMenu(false);
                  }}
                  aria-expanded={showServerMenu}
                  className="hidden h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:flex"
                  aria-label={`Server: ${serverLabel}. Change server`}
                >
                  <Server className="h-4 w-4" aria-hidden="true" />
                  {serverLabel}
                </button>
                {showServerMenu && (
                  <div className="popover absolute bottom-12 right-0 z-50 w-60 p-1.5">
                    <p className="eyebrow px-2.5 pb-1.5 pt-1">Server</p>
                    {sources.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          handleSelectSource(idx);
                          setShowServerMenu(false);
                        }}
                        aria-pressed={activeSourceIndex === idx}
                        className={menuItem(activeSourceIndex === idx)}
                      >
                        <span className="truncate">{s.serverName || `Server ${idx + 1}`}</span>
                        {activeSourceIndex === idx ? (
                          <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <span className="text-[10px] uppercase text-fg-subtle">{s.quality}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audio & Subtitles */}
            <div ref={audioSubsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowAudioSubsMenu((prev) => !prev);
                  setShowSettings(false);
                  setShowServerMenu(false);
                }}
                aria-expanded={showAudioSubsMenu}
                className={`${controlButton} ${activeSubtitleIndex !== -1 ? "text-white" : ""}`}
                aria-label="Audio and subtitles"
                title="Audio & subtitles (C)"
              >
                <Subtitles className="h-5 w-5" aria-hidden="true" />
                {activeSubtitleIndex !== -1 && (
                  <span className="absolute bottom-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-accent" aria-hidden="true" />
                )}
              </button>

              {showAudioSubsMenu && (
                <div className="popover absolute bottom-12 right-0 z-50 w-[min(22rem,calc(100vw-2rem))] p-3">
                  <div className="grid max-h-64 grid-cols-2 gap-3 overflow-y-auto">
                    <div className="border-r border-line pr-2" role="group" aria-labelledby="player-audio-label">
                      <p id="player-audio-label" className="eyebrow mb-1.5 px-2.5">Audio</p>
                      {availableAudioTracks.map((trk, idx) => (
                        <button
                          key={trk.id || idx}
                          type="button"
                          onClick={() => handleSelectAudio(idx)}
                          aria-pressed={idx === activeAudioTrackIndex}
                          className={menuItem(idx === activeAudioTrackIndex)}
                        >
                          <span className="truncate">{trk.label}</span>
                          {idx === activeAudioTrackIndex && <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                        </button>
                      ))}
                    </div>

                    <div role="group" aria-labelledby="player-subs-label">
                      <p id="player-subs-label" className="eyebrow mb-1.5 px-2.5">Subtitles</p>
                      <button
                        type="button"
                        onClick={() => handleSelectSubtitle(-1)}
                        aria-pressed={activeSubtitleIndex === -1}
                        className={menuItem(activeSubtitleIndex === -1)}
                      >
                        <span>Off</span>
                        {activeSubtitleIndex === -1 && <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                      </button>
                      {availableSubtitles.length > 0 ? (
                        availableSubtitles.map((sub, idx) => (
                          <button
                            key={`${sub.language}-${idx}`}
                            type="button"
                            onClick={() => handleSelectSubtitle(idx)}
                            aria-pressed={idx === activeSubtitleIndex}
                            className={menuItem(idx === activeSubtitleIndex)}
                          >
                            <span className="truncate">{sub.label}</span>
                            {idx === activeSubtitleIndex && <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                          </button>
                        ))
                      ) : (
                        <p className="px-2.5 py-2 text-xs leading-snug text-fg-subtle">No subtitles for this title</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div ref={settingsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSettings((prev) => !prev);
                  setShowAudioSubsMenu(false);
                  setShowServerMenu(false);
                }}
                aria-expanded={showSettings}
                className={controlButton}
                aria-label="Playback settings"
              >
                <Settings className={`h-5 w-5 transition-transform ${showSettings ? "rotate-45" : ""}`} aria-hidden="true" />
              </button>

              {showSettings && (
                <div className="popover absolute bottom-12 right-0 z-50 w-60 p-3">
                  {sources.length > 1 && (
                    <div className="mb-3 sm:hidden">
                      <p className="eyebrow mb-1.5">Server</p>
                      <div className="grid grid-cols-2 gap-1">
                        {sources.map((s, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              handleSelectSource(idx);
                              setShowSettings(false);
                            }}
                            className={`truncate rounded px-2 py-1.5 text-left text-sm ${
                              activeSourceIndex === idx ? "bg-white text-black" : "text-fg-muted hover:bg-white/10"
                            }`}
                          >
                            {s.serverName?.split("(")[0]?.trim() || `Server ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {hlsLevels.length > 0 && (
                    <div className="mb-3">
                      <p className="eyebrow mb-1.5">Quality</p>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => setQuality(-1)}
                          className={`rounded px-2 py-1.5 text-sm ${activeQuality === -1 ? "bg-white text-black" : "text-fg-muted hover:bg-white/10"}`}
                        >
                          Auto
                        </button>
                        {hlsLevels.map((lvl) => (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => setQuality(lvl.id)}
                            className={`rounded px-2 py-1.5 text-sm ${activeQuality === lvl.id ? "bg-white text-black" : "text-fg-muted hover:bg-white/10"}`}
                          >
                            {lvl.height}p
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="eyebrow mb-1.5">Speed</p>
                  <div className="grid grid-cols-3 gap-1">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setSpeed(spd)}
                        className={`rounded px-2 py-1.5 text-sm ${playbackSpeed === spd ? "bg-white text-black" : "text-fg-muted hover:bg-white/10"}`}
                      >
                        {spd === 1 ? "Normal" : `${spd}x`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className={controlButton}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Maximize className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      {showHelp && (
        <div
          className="animate-fade-in absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-shortcuts-title"
        >
          <div className="popover w-full max-w-sm p-6">
            <h3 id="player-shortcuts-title" className="mb-4 text-base font-bold text-white">
              Keyboard shortcuts
            </h3>
            <dl className="space-y-2.5 text-sm">
              {[
                ["Space / K", "Play / pause"],
                ["← / →", "Back / forward 10s"],
                ["↑ / ↓", "Volume"],
                ["M", "Mute"],
                ["F", "Full screen"],
                ["C", "Subtitles on / off"],
              ].map(([keys, action]) => (
                <div key={keys} className="flex justify-between gap-4">
                  <dt>
                    <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-white">{keys}</kbd>
                  </dt>
                  <dd className="text-fg-muted">{action}</dd>
                </div>
              ))}
            </dl>
            <button type="button" onClick={() => setShowHelp(false)} className="btn btn-primary mt-6 w-full" autoFocus>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
