"use client";

import { useCallback, useSyncExternalStore } from "react";
import { SubtitleTrack, AudioTrack } from "@/types/streaming";
import { normalizeLanguageCode } from "@/lib/utils/languages";

const PREF_SUB_KEY = "gorib_pref_sub_lang";
const PREF_AUDIO_KEY = "gorib_pref_audio_lang";
const DEFAULT_LANG = "en";

export interface LanguagePreferences {
  preferredSubtitle: string; // ISO code or "off"
  preferredAudio: string; // ISO code
  setPreferredSubtitle: (lang: string) => void;
  setPreferredAudio: (lang: string) => void;
  matchPreferredSubtitle: (availableTracks: SubtitleTrack[]) => number; // index or -1 for off
  matchPreferredAudio: (availableTracks: AudioTrack[]) => number; // index
}

// Preferences live in localStorage; this tiny store lets every player instance
// read them during render and re-render when one of them changes.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readPref(key: string): string {
  try {
    return localStorage.getItem(key) ?? DEFAULT_LANG;
  } catch {
    // Ignore localStorage errors (e.g. incognito or disabled)
    return DEFAULT_LANG;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((listener) => listener());
}

const getServerPref = () => DEFAULT_LANG;

export function useLanguagePreferences(): LanguagePreferences {
  const preferredSubtitle = useSyncExternalStore(subscribe, () => readPref(PREF_SUB_KEY), getServerPref);
  const preferredAudio = useSyncExternalStore(subscribe, () => readPref(PREF_AUDIO_KEY), getServerPref);

  const setPreferredSubtitle = useCallback((lang: string) => {
    writePref(PREF_SUB_KEY, lang.toLowerCase() === "off" ? "off" : normalizeLanguageCode(lang));
  }, []);

  const setPreferredAudio = useCallback((lang: string) => {
    writePref(PREF_AUDIO_KEY, normalizeLanguageCode(lang));
  }, []);

  /**
   * Matches user's preferred subtitle against available tracks.
   * Returns matching track index, or -1 if "off" or no match.
   */
  const matchPreferredSubtitle = useCallback(
    (availableTracks: SubtitleTrack[]): number => {
      if (!availableTracks || availableTracks.length === 0) {
        return -1;
      }
      if (preferredSubtitle === "off") {
        return -1;
      }

      // 1. Direct match with user preferred language
      const matchIndex = availableTracks.findIndex(
        (t) => normalizeLanguageCode(t.language) === preferredSubtitle
      );
      if (matchIndex !== -1) {
        return matchIndex;
      }

      // 2. Track marked as default
      const defaultIndex = availableTracks.findIndex((t) => Boolean(t.default));
      if (defaultIndex !== -1) {
        return defaultIndex;
      }

      // 3. Fallback to English if available
      const enIndex = availableTracks.findIndex(
        (t) => normalizeLanguageCode(t.language) === "en"
      );
      if (enIndex !== -1) {
        return enIndex;
      }

      return -1; // Default to off
    },
    [preferredSubtitle]
  );

  /**
   * Matches user's preferred audio language against available audio tracks.
   * Returns matching track index, or default track.
   */
  const matchPreferredAudio = useCallback(
    (availableTracks: AudioTrack[]): number => {
      if (!availableTracks || availableTracks.length === 0) {
        return 0;
      }

      // 1. Direct match with preferred audio language
      const matchIndex = availableTracks.findIndex(
        (a) => normalizeLanguageCode(a.language) === preferredAudio
      );
      if (matchIndex !== -1) {
        return matchIndex;
      }

      // 2. Track marked as default
      const defaultIndex = availableTracks.findIndex((a) => Boolean(a.default));
      if (defaultIndex !== -1) {
        return defaultIndex;
      }

      return 0;
    },
    [preferredAudio]
  );

  return {
    preferredSubtitle,
    preferredAudio,
    setPreferredSubtitle,
    setPreferredAudio,
    matchPreferredSubtitle,
    matchPreferredAudio,
  };
}

