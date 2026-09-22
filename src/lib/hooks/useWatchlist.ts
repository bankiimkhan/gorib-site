"use client";

import { useCallback, useSyncExternalStore } from "react";
import { MediaItem } from "@/types/media";

const WATCHLIST_STORAGE_KEY = "gorib_watchlist";
const CHANGE_EVENT = "gorib_watchlist_change";

let cachedRaw: string | null = null;
let cachedItems: MediaItem[] = [];

function getSnapshot(): MediaItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedItems = raw ? JSON.parse(raw) : [];
    }
    return cachedItems;
  } catch {
    return cachedItems;
  }
}

const SERVER_SNAPSHOT: MediaItem[] = [];
function getServerSnapshot(): MediaItem[] {
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

function persistWatchlist(items: MediaItem[]) {
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
    cachedRaw = null; // Invalidate cache
    notifyChange();
  } catch (err) {
    console.error("Failed to persist watchlist", err);
  }
}

const emptySubscribe = () => () => {};

export function useWatchlist() {
  const watchlist = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isLoaded = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const addToWatchlist = useCallback((item: MediaItem) => {
    const current = getSnapshot();
    if (current.some((i) => i.id === item.id)) return;
    persistWatchlist([item, ...current]);
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    const current = getSnapshot();
    persistWatchlist(current.filter((i) => i.id !== id));
  }, []);

  const toggleWatchlist = useCallback((item: MediaItem) => {
    const current = getSnapshot();
    const exists = current.some((i) => i.id === item.id);
    if (exists) {
      persistWatchlist(current.filter((i) => i.id !== item.id));
    } else {
      persistWatchlist([item, ...current]);
    }
  }, []);

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((i) => i.id === id),
    [watchlist]
  );

  const clearWatchlist = useCallback(() => {
    persistWatchlist([]);
  }, []);

  return {
    watchlist,
    isLoaded,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
    clearWatchlist,
  };
}
