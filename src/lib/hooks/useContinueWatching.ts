"use client";

import { useCallback, useSyncExternalStore } from "react";
import { MediaType } from "@/types/media";

export interface ContinueWatchingItem {
  id: string; // "movie-{id}" or "tv-{id}-s{season}-e{episode}"
  tmdbId: number;
  type: MediaType;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  season?: number;
  episode?: number;
  currentTime: number;
  duration: number;
  progressPercent: number;
  updatedAt: number;
}

const CONTINUE_WATCHING_KEY = "gorib_continue_watching";
const CHANGE_EVENT = "gorib_continue_watching_change";

let cachedRaw: string | null = null;
let cachedItems: ContinueWatchingItem[] = [];

function getSnapshot(): ContinueWatchingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONTINUE_WATCHING_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedItems = raw ? JSON.parse(raw) : [];
    }
    return cachedItems;
  } catch {
    return cachedItems;
  }
}

const SERVER_SNAPSHOT: ContinueWatchingItem[] = [];
function getServerSnapshot(): ContinueWatchingItem[] {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function notifyChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

const emptySubscribe = () => () => {};

// Items are stored newest-first; keep only the latest episode per show.
let dedupeInput: ContinueWatchingItem[] | null = null;
let dedupeOutput: ContinueWatchingItem[] = [];
function dedupeByTitle(items: ContinueWatchingItem[]): ContinueWatchingItem[] {
  if (items === dedupeInput) return dedupeOutput;
  const seen = new Set<string>();
  dedupeOutput = items.filter((i) => {
    const key = `${i.type}-${i.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  dedupeInput = items;
  return dedupeOutput;
}

export function useContinueWatching() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isLoaded = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const removeProgress = useCallback(
    (tmdbId: number, season?: number, episode?: number) => {
      const itemId =
        season !== undefined && episode !== undefined
          ? `tv-${tmdbId}-s${season}-e${episode}`
          : `movie-${tmdbId}`;

      try {
        const current = getSnapshot();
        const updated = current.filter((i) => i.id !== itemId);
        localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated));
        cachedRaw = null; // Invalidate cache
        notifyChange();
      } catch (err) {
        console.error("Failed to remove continue watching item", err);
      }
    },
    []
  );

  const saveProgress = useCallback(
    (data: {
      tmdbId: number;
      type: MediaType;
      title: string;
      posterUrl?: string;
      backdropUrl?: string;
      season?: number;
      episode?: number;
      currentTime: number;
      duration: number;
    }) => {
      // Don't save if watched less than 5 seconds or finished (over 95%)
      if (data.currentTime < 5) return;
      if (data.duration > 0 && data.currentTime / data.duration > 0.95) {
        removeProgress(data.tmdbId, data.season, data.episode);
        return;
      }

      const itemId =
        data.type === "tv"
          ? `tv-${data.tmdbId}-s${data.season || 1}-e${data.episode || 1}`
          : `movie-${data.tmdbId}`;

      const progressPercent =
        data.duration > 0 ? Math.min(100, Math.round((data.currentTime / data.duration) * 100)) : 0;

      const item: ContinueWatchingItem = {
        id: itemId,
        tmdbId: data.tmdbId,
        type: data.type,
        title: data.title,
        posterUrl: data.posterUrl,
        backdropUrl: data.backdropUrl,
        season: data.season,
        episode: data.episode,
        currentTime: data.currentTime,
        duration: data.duration,
        progressPercent,
        updatedAt: Date.now(),
      };

      try {
        const current = getSnapshot();
        const filtered = current.filter((i) => i.id !== itemId);
        const updated = [item, ...filtered].slice(0, 20); // Keep latest 20
        localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated));
        cachedRaw = null; // Invalidate cache
        notifyChange();
      } catch (err) {
        console.error("Failed to persist continue watching item", err);
      }
    },
    [removeProgress]
  );

  /**
   * Records that playback started without a known position (embedded players
   * don't expose their progress). Existing progress is never overwritten.
   */
  const markStarted = useCallback(
    (data: {
      tmdbId: number;
      type: MediaType;
      title: string;
      posterUrl?: string;
      backdropUrl?: string;
      season?: number;
      episode?: number;
    }) => {
      const itemId =
        data.type === "tv"
          ? `tv-${data.tmdbId}-s${data.season || 1}-e${data.episode || 1}`
          : `movie-${data.tmdbId}`;
      try {
        const current = getSnapshot();
        const existing = current.find((i) => i.id === itemId);
        const item: ContinueWatchingItem = existing
          ? { ...existing, updatedAt: Date.now() }
          : { ...data, id: itemId, currentTime: 0, duration: 0, progressPercent: 0, updatedAt: Date.now() };
        const updated = [item, ...current.filter((i) => i.id !== itemId)].slice(0, 20);
        localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(updated));
        cachedRaw = null;
        notifyChange();
      } catch (err) {
        console.error("Failed to persist continue watching item", err);
      }
    },
    []
  );

  /** Most recently watched episode of a show, for "Continue S2:E3" buttons. */
  const getLatestEpisode = useCallback(
    (tmdbId: number): ContinueWatchingItem | undefined =>
      items.find((i) => i.type === "tv" && i.tmdbId === tmdbId),
    [items]
  );

  const getSavedPosition = useCallback(
    (tmdbId: number, season?: number, episode?: number): number => {
      const itemId =
        season !== undefined && episode !== undefined
          ? `tv-${tmdbId}-s${season}-e${episode}`
          : `movie-${tmdbId}`;
      const found = items.find((i) => i.id === itemId);
      return found ? found.currentTime : 0;
    },
    [items]
  );

  return {
    continueWatchingList: dedupeByTitle(items),
    isLoaded,
    saveProgress,
    markStarted,
    removeProgress,
    getSavedPosition,
    getLatestEpisode,
  };
}
