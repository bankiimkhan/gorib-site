"use client";

import { ShieldCheck } from "lucide-react";
import {
  isConsentRequired,
  setMeasurementConsent,
  useMeasurementConsent,
} from "@/lib/privacy/consent";

/**
 * A deliberately small, first-party consent choice. It gates local analytics
 * and third-party ad tags; it is not presented as a substitute for a CMP when
 * a publisher needs an IAB TCF integration for a particular ad partner.
 */
export function PrivacyChoices() {
  const consent = useMeasurementConsent();

  if (!isConsentRequired() || consent !== "unknown") return null;

  return (
    <section
      className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-xl rounded-xl border border-line-strong bg-surface-2 p-4 shadow-2xl sm:bottom-5"
      aria-label="Privacy choices"
    >
      <div className="flex gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-white">Your privacy choices</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">
            With your permission, we use anonymous audience measurement and load advertising tags. Essential
            streaming features work either way. We honor Do Not Track.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setMeasurementConsent("granted")}>
              Allow analytics & ads
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMeasurementConsent("denied")}>
              Essential only
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
