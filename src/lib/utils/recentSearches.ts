/** Device-local recent searches, shared by the header search box and /search. */
const RECENT_KEY = "gorib_recent_searches";
const MAX_RECENT = 6;
const EMPTY: string[] = [];

const listeners = new Set<() => void>();
let snapshot: string[] | null = null;

function emitChange() {
  snapshot = null;
  listeners.forEach((listener) => listener());
}

/** useSyncExternalStore adapters so React views stay in sync with storage writes. */
export function subscribeRecentSearches(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRecentSearchesSnapshot(): string[] {
  if (snapshot === null) snapshot = readRecentSearches();
  return snapshot;
}

export function getRecentSearchesServerSnapshot(): string[] {
  return EMPTY;
}

export function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((q) => typeof q === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string) {
  try {
    const next = [query, ...readRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase())];
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, MAX_RECENT)));
  } catch {
    // Storage unavailable (private mode): recent searches are a convenience only.
  }
  emitChange();
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // Ignore storage errors.
  }
  emitChange();
}
