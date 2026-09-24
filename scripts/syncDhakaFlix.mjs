import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST_14 = process.env.DHAKA_FLIX_HOST_14 || "http://172.16.50.14";
const HOST_7 = process.env.DHAKA_FLIX_HOST_7 || "http://172.16.50.7";

function cleanTitle(title) {
  return title
    .toLowerCase()
    .replace(/[._\-:;,'`~!?&()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectAudioLanguage(text) {
  const lower = text.toLowerCase();
  if (lower.includes("dual audio") || (lower.includes("hindi") && lower.includes("english"))) {
    return { language: "hi", isDub: true };
  }
  if (lower.includes("hindi") || lower.includes("bollywood")) {
    return { language: "hi", isDub: lower.includes("dub") };
  }
  if (lower.includes("bangla") || lower.includes("bengali") || lower.includes("kolkata")) {
    return { language: "bn", isDub: lower.includes("dub") };
  }
  if (lower.includes("tamil") || lower.includes("telugu") || lower.includes("malayalam") || lower.includes("south")) {
    return { language: "ta", isDub: lower.includes("dub") };
  }
  if (lower.includes("korean") || lower.includes("kor")) {
    return { language: "ko", isDub: lower.includes("dub") };
  }
  if (lower.includes("japanese") || lower.includes("jpn")) {
    return { language: "ja", isDub: lower.includes("dub") };
  }
  return { language: "en", isDub: false };
}

async function fetchLinks(url, timeoutMs = 3500) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return [];
    const html = await res.text();
    const regex = /<a href="([^"]+)">([^<]+)<\/a>/g;
    const links = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const name = match[2].trim();
      if (href !== ".." && !href.startsWith("http://browsehappy.com") && name !== "Parent Directory") {
        links.push({ href, name });
      }
    }
    return links;
  } catch {
    return [];
  }
}

async function resolveVideoFilesBatch(host, items, concurrency = 40) {
  const resolved = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkRes = await Promise.all(
      chunk.map(async (item) => {
        // If item is directly a video file
        if (/\.(mp4|mkv|webm)$/i.test(item.href)) {
          const directUrl = `${host}${item.href.startsWith('/') ? item.href : '/' + item.href}`;
          return {
            title: item.name,
            videoUrl: directUrl,
            year: item.year,
            quality: item.quality,
            language: item.language,
          };
        }

        // Folder - fetch video inside
        const folderUrl = `${host}${item.href.startsWith('/') ? item.href : '/' + item.href}`;
        const cleanFolderUrl = folderUrl.endsWith('/') ? folderUrl : folderUrl + '/';
        const files = await fetchLinks(cleanFolderUrl);

        const videoFiles = files.filter(
          f => /\.(mp4|mkv|webm)$/i.test(f.href) &&
          !f.name.toLowerCase().includes("sample") &&
          !f.name.toLowerCase().includes("trailer")
        );
        const mainVid = videoFiles[0] || files.find(f => /\.(mp4|mkv|webm)$/i.test(f.href));
        if (!mainVid) return null;

        const videoUrl = `${host}${mainVid.href.startsWith('/') ? mainVid.href : cleanFolderUrl.replace(host, '') + mainVid.href}`;

        const combined = `${item.name} ${mainVid.name}`;
        let quality = "1080p";
        if (combined.toLowerCase().includes("720p")) quality = "720p";
        else if (combined.toLowerCase().includes("480p")) quality = "480p";

        const audio = detectAudioLanguage(combined);

        return {
          title: item.name,
          videoUrl,
          year: item.year,
          quality,
          language: audio.language,
        };
      })
    );
    for (const r of chunkRes) {
      if (r) resolved.push(r);
    }
  }
  return resolved;
}

async function syncAll() {
  const t0 = Date.now();
  console.log("=== Starting Comprehensive DhakaFlix Video Catalog Sync ===");

  const candidateCategories = [
    // Server 14
    { host: HOST_14, path: "/DHAKA-FLIX-14/English%20Movies%20%281080p%29/", hasYears: true, name: "English 1080p" },
    { host: HOST_14, path: "/DHAKA-FLIX-14/Hindi%20Movies/", hasYears: true, name: "Hindi" },
    { host: HOST_14, path: "/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/", hasYears: true, name: "South Hindi Dubbed" },
    { host: HOST_14, path: "/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/", hasYears: true, name: "South Original" },
    { host: HOST_14, path: "/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/", hasYears: false, name: "Animation 1080p" },
    { host: HOST_14, path: "/DHAKA-FLIX-14/Animation%20Movies/", hasYears: true, name: "Animation" },
    { host: HOST_14, path: "/DHAKA-FLIX-14/IMDb%20Top-250%20Movies/", hasYears: false, name: "IMDb Top 250" },

    // Server 7
    { host: HOST_7, path: "/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/", hasYears: true, name: "Kolkata Bangla" },
    { host: HOST_7, path: "/DHAKA-FLIX-7/3D%20Movies/", hasYears: false, name: "3D Movies" },
    { host: HOST_7, path: "/DHAKA-FLIX-7/English%20Movies/", hasYears: true, name: "English 720p" },
  ];

  const allFolders = [];

  for (const cat of candidateCategories) {
    console.log(`[Scanning] ${cat.name}...`);
    if (cat.hasYears) {
      const yearDirs = await fetchLinks(`${cat.host}${cat.path}`);
      const movies = await Promise.all(
        yearDirs.map(async (yd) => {
          const ydUrl = `${cat.host}${yd.href.startsWith('/') ? yd.href : '/' + yd.href}`;
          const items = await fetchLinks(ydUrl);
          return items.map((m) => {
            const yMatch = m.name.match(/\b(19\d\d|20\d\d)\b/);
            return {
              name: m.name,
              href: m.href,
              year: yMatch ? parseInt(yMatch[1], 10) : undefined,
            };
          });
        })
      );
      const catFlat = movies.flat();
      console.log(`  -> Found ${catFlat.length} folders in ${cat.name}`);
      allFolders.push({ host: cat.host, items: catFlat, name: cat.name });
    } else {
      const items = await fetchLinks(`${cat.host}${cat.path}`);
      const mapped = items.map((m) => {
        const yMatch = m.name.match(/\b(19\d\d|20\d\d)\b/);
        return {
          name: m.name,
          href: m.href,
          year: yMatch ? parseInt(yMatch[1], 10) : undefined,
        };
      });
      console.log(`  -> Found ${mapped.length} folders in ${cat.name}`);
      allFolders.push({ host: cat.host, items: mapped, name: cat.name });
    }
  }

  // Also Foreign Language on Server 7
  const flDirs = await fetchLinks(`${HOST_7}/DHAKA-FLIX-7/Foreign%20Language%20Movies/`);
  const flMovies = await Promise.all(
    flDirs.map(async (ld) => {
      const ldUrl = `${HOST_7}${ld.href.startsWith('/') ? ld.href : '/' + ld.href}`;
      const items = await fetchLinks(ldUrl);
      return items.map((m) => {
        const yMatch = m.name.match(/\b(19\d\d|20\d\d)\b/);
        return {
          name: m.name,
          href: m.href,
          year: yMatch ? parseInt(yMatch[1], 10) : undefined,
        };
      });
    })
  );
  const flFlat = flMovies.flat();
  allFolders.push({ host: HOST_7, items: flFlat, name: "Foreign Languages" });
  console.log(`  -> Found ${flFlat.length} folders in Foreign Languages`);

  const totalFoldersCount = allFolders.reduce((acc, f) => acc + f.items.length, 0);
  console.log(`\nTotal folders collected across all categories: ${totalFoldersCount}`);
  console.log("Now resolving direct video stream files in parallel (concurrency 50)...");

  const catalog = [];
  for (const group of allFolders) {
    const resolvedGroup = await resolveVideoFilesBatch(group.host, group.items, 50);
    catalog.push(...resolvedGroup);
    console.log(`[Resolved] ${group.name}: ${resolvedGroup.length} playable video streams`);
  }

  // Deduplicate
  const seen = new Set();
  const dedupedCatalog = [];
  for (const entry of catalog) {
    const key = `${cleanTitle(entry.title)}_${entry.year || 0}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedCatalog.push(entry);
    }
  }

  const outPath = path.resolve(__dirname, "../src/lib/api/streaming/dhakaflix-catalog.json");
  fs.writeFileSync(outPath, JSON.stringify(dedupedCatalog), "utf-8");

  console.log(`\n=== SYNC COMPLETE! ===`);
  console.log(`Total Playable Titles: ${dedupedCatalog.length}`);
  console.log(`Saved to: ${outPath}`);
  console.log(`File size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total Elapsed Time: ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
}

syncAll();

