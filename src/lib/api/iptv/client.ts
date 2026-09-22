import { IPTVChannel, IPTVCategory, IPTVCountry, IPTVChannelsResponse } from "@/types/iptv";
import { parseM3U } from "./parser";

const IPTV_BASE_URL = "https://iptv-org.github.io/iptv";

export const IPTV_CATEGORIES: IPTVCategory[] = [
  { id: "all", name: "All Channels" },
  { id: "news", name: "News", icon: "📰" },
  { id: "sports", name: "Sports", icon: "⚽" },
  { id: "movies", name: "Movies", icon: "🎬" },
  { id: "entertainment", name: "Entertainment", icon: "🍿" },
  { id: "kids", name: "Kids & Animation", icon: "🧸" },
  { id: "music", name: "Music", icon: "🎵" },
  { id: "documentary", name: "Documentary", icon: "🌍" },
  { id: "series", name: "TV Series", icon: "📺" },
  { id: "comedy", name: "Comedy", icon: "😂" },
  { id: "lifestyle", name: "Lifestyle", icon: "✨" },
  { id: "religious", name: "Religious", icon: "🕌" },
  { id: "education", name: "Education", icon: "📚" },
];

export const IPTV_COUNTRIES: IPTVCountry[] = [
  { code: "all", name: "All Countries", flag: "🌍" },
  { code: "bd", name: "Bangladesh", flag: "🇧🇩" },
  { code: "in", name: "India", flag: "🇮🇳" },
  { code: "us", name: "United States", flag: "🇺🇸" },
  { code: "uk", name: "United Kingdom", flag: "🇬🇧" },
  { code: "ca", name: "Canada", flag: "🇨🇦" },
  { code: "au", name: "Australia", flag: "🇦🇺" },
  { code: "pk", name: "Pakistan", flag: "🇵🇰" },
  { code: "sa", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "ae", name: "UAE", flag: "🇦🇪" },
  { code: "tr", name: "Turkey", flag: "🇹🇷" },
  { code: "fr", name: "France", flag: "🇫🇷" },
  { code: "de", name: "Germany", flag: "🇩🇪" },
  { code: "jp", name: "Japan", flag: "🇯🇵" },
];

// In-memory cache for playlist text to avoid excessive network calls
const playlistCache = new Map<string, { data: IPTVChannel[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Curated high-availability fallback channels across popular categories & countries
 */
export const CURATED_FALLBACK_CHANNELS: IPTVChannel[] = [
  // Bangladesh
  {
    id: "ATNBangla.bd@SD",
    name: "ATN Bangla",
    rawName: "ATN Bangla (720p)",
    logo: "https://i.imgur.com/K1HmMRz.png",
    group: "General",
    url: "http://tvsen5.aynascope.net/atnbangla/index.m3u8",
    country: "bd",
    quality: "720P",
    isGeoBlocked: false,
    httpFallback: true,
  },
  {
    id: "BanglaVision.bd@SD",
    name: "Bangla Vision",
    rawName: "Bangla Vision (720p)",
    logo: "https://i.imgur.com/nCWgp38.png",
    group: "General",
    url: "https://tvsen5.aynaott.com/banglavision/index.m3u8",
    country: "bd",
    quality: "720P",
    isGeoBlocked: false,
  },
  {
    id: "DBCNews.bd@SD",
    name: "DBC News",
    rawName: "DBC News (480p)",
    logo: "https://i.imgur.com/Qbt6q4z.png",
    group: "News",
    url: "http://tvn3.chowdhury-shaheb.com/dbc/index.m3u8",
    country: "bd",
    quality: "480P",
    isGeoBlocked: false,
    httpFallback: true,
  },
  {
    id: "DurontoTV.bd@SD",
    name: "Duronto TV",
    rawName: "Duronto TV (720p)",
    logo: "https://i.imgur.com/gXsddRK.png",
    group: "Kids",
    url: "https://tvsen6.aynaott.com/6xyZ3N4oHv2KBJdB6W4p/index.m3u8",
    country: "bd",
    quality: "720P",
    isGeoBlocked: false,
  },
  {
    id: "MaasrangaTV.bd@SD",
    name: "Maasranga TV",
    rawName: "Maasranga TV (720p)",
    logo: "https://i.imgur.com/uVZJMed.png",
    group: "Entertainment",
    url: "http://tvsen5.aynascope.net/maasrangatv/index.m3u8",
    country: "bd",
    quality: "720P",
    isGeoBlocked: false,
    httpFallback: true,
  },
  {
    id: "MadaniChannelBangla.bd@SD",
    name: "Madani Channel Bangla",
    rawName: "Madani Channel Bangla (1080p)",
    logo: "https://i.imgur.com/vIJTVia.png",
    group: "Religious",
    url: "https://streaming.madanichannel.tv/static/streaming-playlists/hls/d3e49b76-ac06-4689-a641-9200445b647f/master.m3u8",
    country: "bd",
    quality: "1080P",
    isGeoBlocked: false,
  },
  // News - International
  {
    id: "AlJazeeraEnglish.qa@HD",
    name: "Al Jazeera English",
    rawName: "Al Jazeera English (1080p)",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Al_Jazeera_English_logo.svg/512px-Al_Jazeera_English_logo.svg.png",
    group: "News",
    url: "https://live-hls-web-aje.getaj.net/AJE/01.m3u8",
    country: "qa",
    quality: "1080P",
    isGeoBlocked: false,
  },
  {
    id: "SkyNews.uk@HD",
    name: "Sky News",
    rawName: "Sky News (1080p)",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Sky_News_logo_2015.svg/512px-Sky_News_logo_2015.svg.png",
    group: "News",
    url: "https://linear417-gb-hls1-prd-cf.cloud.drr.rakuten.tv/live/button/417/master.m3u8",
    country: "uk",
    quality: "1080P",
    isGeoBlocked: false,
  },
  {
    id: "ABCNewsLive.us@HD",
    name: "ABC News Live",
    rawName: "ABC News Live (720p)",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/ABC_News_Live_logo_2021.svg/512px-ABC_News_Live_logo_2021.svg.png",
    group: "News",
    url: "https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8",
    country: "us",
    quality: "720P",
    isGeoBlocked: false,
  },
  {
    id: "EuronewsEnglish.fr@HD",
    name: "Euronews English",
    rawName: "Euronews English (1080p)",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Euronews_2016_logo.svg/512px-Euronews_2016_logo.svg.png",
    group: "News",
    url: "https://rakuten-euronews-1-gb.samsung.wurl.tv/manifest/playlist.m3u8",
    country: "fr",
    quality: "1080P",
    isGeoBlocked: false,
  },
  {
    id: "DWEnglish.de@HD",
    name: "Deutsche Welle (DW English)",
    rawName: "DW English (1080p)",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_logo.svg/512px-Deutsche_Welle_logo.svg.png",
    group: "News",
    url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    country: "de",
    quality: "1080P",
    isGeoBlocked: false,
  },
  {
    id: "France24English.fr@HD",
    name: "France 24 English",
    rawName: "France 24 English (1080p)",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/France_24_logo.svg/512px-France_24_logo.svg.png",
    group: "News",
    url: "https://stream.france24.com/hls/live/2037599/f24_en/master_1000.m3u8",
    country: "fr",
    quality: "1080P",
    isGeoBlocked: false,
  },
  // Sports
  {
    id: "RedBullTV.at@HD",
    name: "Red Bull TV",
    rawName: "Red Bull TV (1080p)",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png",
    group: "Sports",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    country: "at",
    quality: "1080P",
    isGeoBlocked: false,
  },
  {
    id: "EdgeSport.us@HD",
    name: "Edge Sport",
    rawName: "Edge Sport (1080p)",
    logo: "https://i.imgur.com/KxS342E.png",
    group: "Sports",
    url: "https://edgesport-samsunguk.amagi.tv/playlist.m3u8",
    country: "us",
    quality: "1080P",
    isGeoBlocked: false,
  },
  // Movies & Entertainment
  {
    id: "PlutoAction.us@SD",
    name: "Pluto TV Action",
    rawName: "Pluto TV Action (720p)",
    logo: "https://images.pluto.tv/channels/53cf89d41d9a265e09849202/colorLogoPNG.png",
    group: "Movies",
    url: "https://jmp2.uk/plu-53cf89d41d9a265e09849202.m3u8",
    country: "us",
    quality: "720P",
    isGeoBlocked: false,
  },
  {
    id: "FilmRiseAction.us@HD",
    name: "FilmRise Action",
    rawName: "FilmRise Action (1080p)",
    logo: "https://provider-static.plex.tv/epg/cms/production/34a4a584-0ee0-449e-ba60-e8ea4ea56885/filmriseaction_logo_dark.png",
    group: "Movies",
    url: "https://linear-41.frequency.stream/mt/studio/41/hls/master/playlist.m3u8",
    country: "us",
    quality: "1080P",
    isGeoBlocked: false,
  },
  {
    id: "RakutenActionMovies.uk@HD",
    name: "Rakuten TV Action Movies",
    rawName: "Rakuten TV Action Movies (1080p)",
    logo: "https://images.rakuten.tv/channels/flat_icon_action_gb.png",
    group: "Movies",
    url: "https://rakuten-actionmovies-1-eu.samsung.wurl.tv/manifest/playlist.m3u8",
    country: "uk",
    quality: "1080P",
    isGeoBlocked: false,
  },
  // Documentary & Nature
  {
    id: "NASA_TV.us@HD",
    name: "NASA TV Public",
    rawName: "NASA TV Public (720p)",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/512px-NASA_logo.svg.png",
    group: "Documentary",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    country: "us",
    quality: "720P",
    isGeoBlocked: false,
  },
  {
    id: "ExploreNature.us@HD",
    name: "Explore Nature",
    rawName: "Explore Nature (1080p)",
    logo: "https://i.imgur.com/KxS342E.png",
    group: "Documentary",
    url: "https://amg01448-cinedigm-explorenature-samsungus-e3bce.amagi.tv/playlist/amg01448-cinedigm-explorenature-samsungus/playlist.m3u8",
    country: "us",
    quality: "1080P",
    isGeoBlocked: false,
  },
];

/**
 * Fetches an M3U playlist from iptv-org and parses it.
 */
async function fetchPlaylist(url: string, defaultCountry?: string): Promise<IPTVChannel[]> {
  const cached = playlistCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      console.warn(`[IPTV Client] Failed to fetch playlist from ${url}, status: ${res.status}`);
      return [];
    }

    const text = await res.text();
    const parsed = parseM3U(text, defaultCountry);

    if (parsed.length > 0) {
      playlistCache.set(url, { data: parsed, timestamp: Date.now() });
    }

    return parsed;
  } catch (error) {
    console.error(`[IPTV Client] Network error fetching ${url}:`, error);
    return [];
  }
}

/**
 * Loads channels based on requested country or category
 */
export async function getIPTVChannels(options: {
  country?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<IPTVChannelsResponse> {
  const { country = "all", category = "all", search = "", page = 1, limit = 48 } = options;

  let allChannels: IPTVChannel[] = [];

  // Determine optimal playlist sources
  if (country && country !== "all") {
    const countryUrl = `${IPTV_BASE_URL}/countries/${country.toLowerCase()}.m3u`;
    allChannels = await fetchPlaylist(countryUrl, country.toLowerCase());
  } else if (category && category !== "all") {
    const categoryUrl = `${IPTV_BASE_URL}/categories/${category.toLowerCase()}.m3u`;
    allChannels = await fetchPlaylist(categoryUrl);
  } else {
    // Default / All: fetch popular country lists in parallel (Bangladesh, US, UK, India)
    const [bdChannels, usChannels, ukChannels, inChannels] = await Promise.all([
      fetchPlaylist(`${IPTV_BASE_URL}/countries/bd.m3u`, "bd"),
      fetchPlaylist(`${IPTV_BASE_URL}/countries/us.m3u`, "us"),
      fetchPlaylist(`${IPTV_BASE_URL}/countries/uk.m3u`, "uk"),
      fetchPlaylist(`${IPTV_BASE_URL}/countries/in.m3u`, "in"),
    ]);

    allChannels = [...bdChannels, ...usChannels, ...ukChannels, ...inChannels];
  }

  // If external fetch returned nothing, use curated fallback
  if (allChannels.length === 0) {
    allChannels = [...CURATED_FALLBACK_CHANNELS];
  }

  // Remove exact duplicates by URL or ID
  const seenUrls = new Set<string>();
  const uniqueChannels: IPTVChannel[] = [];
  for (const ch of allChannels) {
    if (!seenUrls.has(ch.url)) {
      seenUrls.add(ch.url);
      uniqueChannels.push(ch);
    }
  }

  // Filter by country if specified alongside category
  let filtered = uniqueChannels;
  if (country && country !== "all") {
    filtered = filtered.filter(
      (ch) => ch.country && ch.country.toLowerCase() === country.toLowerCase()
    );
  }

  // Filter by category if specified alongside country
  if (category && category !== "all") {
    const catLower = category.toLowerCase();
    filtered = filtered.filter((ch) => {
      const groupLower = (ch.group || "").toLowerCase();
      if (catLower === "kids") return groupLower.includes("kid") || groupLower.includes("animat");
      if (catLower === "news") return groupLower.includes("news");
      if (catLower === "sports") return groupLower.includes("sport");
      if (catLower === "movies") return groupLower.includes("movie") || groupLower.includes("cinema");
      if (catLower === "series") return groupLower.includes("series");
      if (catLower === "music") return groupLower.includes("music");
      if (catLower === "documentary") return groupLower.includes("doc");
      if (catLower === "entertainment") return groupLower.includes("entertain") || groupLower.includes("general");
      return groupLower.includes(catLower);
    });
  }

  // Filter by search query
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        (ch.group && ch.group.toLowerCase().includes(q)) ||
        (ch.country && ch.country.toLowerCase().includes(q))
    );
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginatedChannels = filtered.slice(startIndex, startIndex + limit);

  return {
    channels: paginatedChannels,
    total,
    page,
    limit,
    hasMore: startIndex + limit < total,
    categories: IPTV_CATEGORIES,
    countries: IPTV_COUNTRIES,
  };
}

