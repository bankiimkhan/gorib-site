export type AdExperimentVariant = "A" | "B" | "C";

const EXPERIMENT_STORAGE_KEY = "gorib_ad_experiment_variant";

/**
 * Returns an assigned experiment variant for A/B testing ad layouts.
 * Persisted in sessionStorage / localStorage for consistent user experience.
 */
export function getAdExperimentVariant(experimentName = "placement_density_v1"): AdExperimentVariant {
  if (typeof window === "undefined") return "A";

  const key = `${EXPERIMENT_STORAGE_KEY}_${experimentName}`;
  const stored = localStorage.getItem(key);
  if (stored === "A" || stored === "B" || stored === "C") {
    return stored;
  }

  // Assign pseudo-random variant
  const variants: AdExperimentVariant[] = ["A", "B", "C"];
  const assigned = variants[Math.floor(Math.random() * variants.length)];

  try {
    localStorage.setItem(key, assigned);
  } catch {
    // Ignore storage quota or access exceptions
  }

  return assigned;
}

