"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "gorib_livetv_favorites";
const CHANGE_EVENT = "gorib_livetv_favorites_change";

let cachedRaw: string | null = null;
let cachedItems: string[] = [];

function getSnapshot(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedItems = raw ? JSON.parse(raw) : [];
    }
    return cachedItems;
  } catch {
    return cachedItems;
  }
}

const SERVER_SNAPSHOT: string[] = [];
function getServerSnapshot(): string[] {
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

export function useLiveTVFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const loaded = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const toggleFavorite = useCallback((channelId: string) => {
    try {
      const current = getSnapshot();
      let updated: string[];
      if (current.includes(channelId)) {
        updated = current.filter((id) => id !== channelId);
      } else {
        updated = [...current, channelId];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      cachedRaw = null;
      notifyChange();
    } catch (e) {
      console.error("Failed to save Live TV favorites to localStorage", e);
    }
  }, []);

  const isFavorite = useCallback(
    (channelId: string) => favorites.includes(channelId),
    [favorites]
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    loaded,
  };
}
