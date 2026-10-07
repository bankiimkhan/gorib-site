const COUNTRY_NAMES: Record<string, string> = {
  BD: "Bangladesh",
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  DE: "Germany",
  AU: "Australia",
  FR: "France",
  SG: "Singapore",
  MY: "Malaysia",
  PK: "Pakistan",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  BR: "Brazil",
  JP: "Japan",
  KR: "South Korea",
  NL: "Netherlands",
  SE: "Sweden",
  NO: "Norway",
  ES: "Spain",
  IT: "Italy",
  NP: "Nepal",
  LK: "Sri Lanka",
  ID: "Indonesia",
  PH: "Philippines",
  TH: "Thailand",
  VN: "Vietnam",
  ZA: "South Africa",
  NZ: "New Zealand",
  IE: "Ireland",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  PL: "Poland",
  TR: "Turkey",
  RU: "Russia",
  MX: "Mexico",
  AR: "Argentina",
  EG: "Egypt",
  KW: "Kuwait",
  QA: "Qatar",
  OM: "Oman",
  BH: "Bahrain",
};

/** Convert 2-letter country code to flag emoji */
export function countryCodeToFlag(code: string): string {
  const normalized = (code || "").toUpperCase().trim();
  if (normalized.length !== 2 || normalized === "XX" || normalized === "T1") {
    return "🌐";
  }
  try {
    const codePoints = [...normalized].map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "🌐";
  }
}

/** Get full country name from 2-letter code */
export function getCountryName(code: string): string {
  const normalized = (code || "").toUpperCase().trim();
  if (!normalized || normalized === "XX" || normalized === "T1") {
    return "Global / Unknown";
  }
  if (COUNTRY_NAMES[normalized]) {
    return COUNTRY_NAMES[normalized];
  }
  try {
    if (typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined") {
      const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
      const name = displayNames.of(normalized);
      if (name) return name;
    }
  } catch {
    // Fallback
  }
  return normalized;
}

/** Map timezones to likely countries for local/dev fallback */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  "Asia/Dhaka": "BD",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Los_Angeles": "US",
  "America/Denver": "US",
  "America/Phoenix": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Asia/Singapore": "SG",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Karachi": "PK",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Kathmandu": "NP",
  "Asia/Colombo": "LK",
};

/** Detect country from headers or fallback timezone */
export function detectCountryFromHeaders(headers: Headers, fallbackTimezone?: string): string {
  const cfCountry = headers.get("cf-ipcountry");
  if (cfCountry && cfCountry.length === 2 && cfCountry !== "XX" && cfCountry !== "T1") {
    return cfCountry.toUpperCase();
  }

  const xCountry = headers.get("x-country") || headers.get("x-vercel-ip-country");
  if (xCountry && xCountry.length === 2 && xCountry !== "XX") {
    return xCountry.toUpperCase();
  }

  if (fallbackTimezone && TIMEZONE_TO_COUNTRY[fallbackTimezone]) {
    return TIMEZONE_TO_COUNTRY[fallbackTimezone];
  }

  return "US";
}
