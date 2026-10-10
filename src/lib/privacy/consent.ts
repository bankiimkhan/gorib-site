"use client";

import { useSyncExternalStore } from "react";

const CONSENT_STORAGE_KEY = "gorib_measurement_consent";
const CONSENT_EVENT = "gorib:measurement-consent";

export type MeasurementConsent = "granted" | "denied" | "unknown";

export function isConsentRequired(): boolean {
  return process.env.NEXT_PUBLIC_PRIVACY_REQUIRE_CONSENT === "true";
}

function hasDoNotTrackSignal(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.doNotTrack === "1" || (window as Window & { doNotTrack?: string }).doNotTrack === "1";
}

export function getMeasurementConsent(): MeasurementConsent {
  if (typeof window === "undefined") return isConsentRequired() ? "unknown" : "granted";
  if (hasDoNotTrackSignal()) return "denied";
  if (!isConsentRequired()) return "granted";

  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : "unknown";
  } catch {
    return "unknown";
  }
}

/** True only when the visitor has not opted out and consent is available when required. */
export function hasMeasurementConsent(): boolean {
  return getMeasurementConsent() === "granted";
}

export function setMeasurementConsent(consent: Exclude<MeasurementConsent, "unknown">): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  } catch {
    // If storage is blocked, fail closed when consent is required.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Lets a visitor reopen the preference prompt from the footer. */
export function resetMeasurementConsent(): void {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_EVENT, callback);
  };
}

function getServerSnapshot(): MeasurementConsent {
  return isConsentRequired() ? "unknown" : "granted";
}

export function useMeasurementConsent(): MeasurementConsent {
  return useSyncExternalStore(subscribe, getMeasurementConsent, getServerSnapshot);
}
