"use client";

import { useState, useEffect, useCallback } from "react";
import { MediaItem } from "@/types/media";

const WATCHLIST_STORAGE_KEY = "gorib_watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<MediaItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load watchlist from localStorage", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveToStorage = (items: MediaItem[]) => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to persist watchlist", err);
    }
  };

  const addToWatchlist = useCallback((item: MediaItem) => {
    setWatchlist((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      const updated = [item, ...prev];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const toggleWatchlist = useCallback((item: MediaItem) => {
    setWatchlist((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      const updated = exists ? prev.filter((i) => i.id !== item.id) : [item, ...prev];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((i) => i.id === id),
    [watchlist]
  );

  return {
    watchlist,
    isLoaded,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
  };
}

