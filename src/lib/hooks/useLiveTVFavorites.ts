"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "gorib_livetv_favorites";

export function useLiveTVFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load Live TV favorites from localStorage", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  const toggleFavorite = (channelId: string) => {
    setFavorites((prev) => {
      let updated: string[];
      if (prev.includes(channelId)) {
        updated = prev.filter((id) => id !== channelId);
      } else {
        updated = [...prev, channelId];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save Live TV favorites to localStorage", e);
      }
      return updated;
    });
  };

  const isFavorite = (channelId: string) => {
    return favorites.includes(channelId);
  };

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    loaded,
  };
}

