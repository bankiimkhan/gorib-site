/**
 * Formats runtime in minutes into "Xh Ym" or "Xm"
 */
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "N/A";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Extracts the 4-digit release year from a date string (YYYY-MM-DD)
 */
export function formatYear(dateStr: string | null | undefined): number | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Formats vote average to 1 decimal place (e.g. 7.8)
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined || rating <= 0) return "NR";
  return rating.toFixed(1);
}

/**
 * Formats numbers into human-readable compact numbers (e.g. 1.2K, 3.4M)
 */
export function formatCompactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(num);
}

/**
 * Formats video duration in seconds to MM:SS or HH:MM:SS
 */
export function formatPlayerTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "00:00";
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const paddedMin = minutes.toString().padStart(2, "0");
  const paddedSec = secs.toString().padStart(2, "0");

  if (hours > 0) {
    const paddedHours = hours.toString().padStart(2, "0");
    return `${paddedHours}:${paddedMin}:${paddedSec}`;
  }
  return `${paddedMin}:${paddedSec}`;
}

/**
 * Creates URL-friendly slug from string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

