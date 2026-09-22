import { IPTVChannel } from "@/types/iptv";

/**
 * Parses an M3U / M3U8 playlist content string into an array of IPTVChannel items.
 */
export function parseM3U(content: string, defaultCountry?: string): IPTVChannel[] {
  if (!content || typeof content !== "string") {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const channels: IPTVChannel[] = [];

  let currentChannel: Partial<IPTVChannel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      currentChannel = {};

      // Extract tvg-id
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
      const tvgId = tvgIdMatch ? tvgIdMatch[1].trim() : "";

      // Extract tvg-logo
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const tvgLogo = tvgLogoMatch ? tvgLogoMatch[1].trim() : "";

      // Extract group-title
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      let group = groupMatch ? groupMatch[1].trim() : "General";
      if (!group || group.toLowerCase() === "undefined") {
        group = "General";
      }
      // If group has multiple semicolons (e.g. "Movies;Religious"), take the first primary category
      if (group.includes(";")) {
        group = group.split(";")[0].trim();
      }

      // Extract title (everything after the last comma)
      const commaIndex = line.lastIndexOf(",");
      const rawTitle = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : tvgId || "Untitled Channel";

      // Detect resolution / quality: (1080p), (720p), (480p), (360p), (HD), (SD)
      const qualityMatch = rawTitle.match(/\((\d{3,4}p|HD|SD|FHD|4K)\)/i);
      const quality = qualityMatch ? qualityMatch[1].toUpperCase() : undefined;

      // Detect Geo-blocked tag
      const isGeoBlocked = /\[Geo-blocked\]/i.test(rawTitle);

      // Cleaned channel name without (1080p) or [Geo-blocked] or [Not 24/7]
      const cleanName = rawTitle
        .replace(/\((\d{3,4}p|HD|SD|FHD|4K)\)/gi, "")
        .replace(/\[.*?\]/g, "")
        .trim();

      // Detect country from tvg-id (e.g., "Channel.bd@SD", "BBC.uk@HD", "ABC.us@SD")
      let country = defaultCountry;
      if (!country && tvgId) {
        const countryMatch = tvgId.match(/\.([a-z]{2})@/i);
        if (countryMatch) {
          country = countryMatch[1].toLowerCase();
        }
      }

      currentChannel = {
        id: tvgId || `${cleanName.toLowerCase().replace(/\s+/g, "-")}-${channels.length + 1}`,
        name: cleanName || rawTitle,
        rawName: rawTitle,
        logo: tvgLogo,
        group,
        country: country?.toLowerCase(),
        quality,
        isGeoBlocked,
      };
    } else if (line.startsWith("#")) {
      // Other directive, ignore
      continue;
    } else if (currentChannel) {
      // This is the stream URL
      const streamUrl = line.trim();
      if (streamUrl.startsWith("http://") || streamUrl.startsWith("https://")) {
        const channel: IPTVChannel = {
          id: currentChannel.id || `channel-${channels.length + 1}`,
          name: currentChannel.name || "Live Channel",
          rawName: currentChannel.rawName || currentChannel.name || "Live Channel",
          logo: currentChannel.logo || "",
          group: currentChannel.group || "General",
          url: streamUrl,
          country: currentChannel.country || defaultCountry,
          quality: currentChannel.quality,
          isGeoBlocked: currentChannel.isGeoBlocked || false,
          httpFallback: streamUrl.startsWith("http://"),
        };
        channels.push(channel);
      }
      currentChannel = null;
    }
  }

  return channels;
}

