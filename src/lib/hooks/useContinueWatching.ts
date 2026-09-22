"use client";

import { useState, useEffect, useCallback } from "react";
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

export function useContinueWatching() {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTINUE_WATCHING_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load continue watching list", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveItems = (newItems: ContinueWatchingItem[]) => {
    try {
      localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(newItems));
    } catch (err) {
      console.error("Failed to persist continue watching list", err);
    }
  };

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

      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== itemId);
        const updated = [item, ...filtered].slice(0, 20); // Keep latest 20
        saveItems(updated);
        return updated;
      });
    },
    []
  );

  const removeProgress = useCallback(
    (tmdbId: number, season?: number, episode?: number) => {
      const itemId =
        season !== undefined && episode !== undefined
          ? `tv-${tmdbId}-s${season}-e${episode}`
          : `movie-${tmdbId}`;

      setItems((prev) => {
        const updated = prev.filter((i) => i.id !== itemId);
        saveItems(updated);
        return updated;
      });
    },
    []
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
    continueWatchingList: items,
    isLoaded,
    saveProgress,
    removeProgress,
    getSavedPosition,
  };
}

