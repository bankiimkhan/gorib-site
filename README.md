This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
# gorib.lol — Premium Movie & TV Streaming Platform

## Getting Started
A production-grade, cinematic movie and television streaming platform inspired by premium streaming experiences (Netflix-level UX quality), built with Next.js 16, TypeScript, Tailwind CSS, and a decoupled API architecture.

First, run the development server:
---

## 1. Project Overview

**gorib.lol** connects two independent external data ecosystems into a unified, high-performance streaming web application:
1. **Metadata Ecosystem (TMDB)**: Powers movie and television discovery, posters, high-resolution backdrops, cast & crew credits, ratings, season/episode catalogs, trending lists, recommendations, and search.
2. **Streaming Ecosystem**: Resolves playable media streams (HLS `.m3u8`, MP4, or sandboxable embeds), audio/subtitles, and quality tiers.

The platform includes a dedicated HTML5 & `hls.js` video player, local anonymous continue watching progress tracking, device-local watchlist ("My List"), configurable ad slot infrastructure, and full responsive design across desktop, tablet, and mobile.

---

## 2. Core Features

- **Cinematic Homepage**:
  - Full-bleed dynamic Hero banner with backdrop, ratings, and instant playback trigger.
  - Continue Watching carousel restoring exact playback timestamps.
  - Trending Today, Popular Movies, Acclaimed TV Series, and Top-Rated rows.
- **Movies & TV Show Catalogs**:
  - Filter by genre, release year, and sorting (popularity, rating, newest).
  - Responsive 2:3 aspect-ratio poster grid with hover zoom, quick-play, and watchlist actions.
  - Pagination and filter state persisted in URL query parameters.
- **Search System**:
  - Fast debounced input (350–400ms) avoiding API spam.
  - Multi-search filtering (All, Movies, TV Series).
  - Loading skeleton states and empty state recommendations.
- **Rich Details Pages**:
  - Comprehensive metadata, directors, cast headshots, and YouTube trailers.
  - Interactive Season & Episode selector for TV shows with episode stills and runtimes.
- **Dedicated Cinema Video Player**:
  - Decoupled from TMDB; consumes normalized stream sources.
  - Adaptive bitrate HLS streaming powered by `hls.js`.
  - Full keyboard shortcuts (`Space`/`K` play/pause, `Left`/`Right` seek, `Up`/`Down` volume, `F` fullscreen, `M` mute).
  - Multi-server switching with fallback on stream failure.
  - Playback speed controls (0.5x to 2x).
  - Automatic control hiding on inactivity.
- **Device-Local Privacy**:
  - Watchlist ("My List") and Continue Watching progress are stored strictly in `localStorage`.
  - Zero fake server accounts or invasive tracking.
- **Ad Slot Infrastructure**:
  - Pluggable `<AdSlot placement="..." />` components (`home-top`, `home-feed`, `details`, `player-bottom`, `search`).
  - Configurable via `NEXT_PUBLIC_AD_SLOTS_ENABLED=false` (renders `null` with 0 layout shift when disabled).

---

## 3. Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   Frontend UI Layer                    │
│   (Home, Movies, TV, Details, Watch, Search, Genres)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Application Services                   │
│      services/media             services/streaming     │
└─────────────┬─────────────────────────────┬────────────┘
              │                             │
              ▼                             ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│         TMDB API          │ │  Media Identity Resolver │
│   (Metadata, Cast, Crew,  │ │  (TMDB ID ➔ IMDb / TVDB /│
│    Seasons, Search)       │ │   Title + Year Mapping)  │
└───────────────────────────┘ └─────────────┬────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │    Streaming Provider    │
                              │   (Abstract Interface +  │
                              │    Pluggable Adapters)   │
                              └─────────────┬────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │   Unified Video Player   │
                              │   (HTML5 + HLS.js Engine)│
                              └──────────────────────────┘
```

---

## 4. Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Language**: TypeScript 5 (Strict type checking)
- **Styling**: Tailwind CSS 4 (Cinematic Dark design tokens)
- **Video Engine**: HTML5 Video + `hls.js` (Adaptive HTTP Live Streaming)
- **Icons**: `lucide-react`
- **Testing**: `vitest` + React Testing Library + `jsdom`

---

## 5. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
npm run dev
# or
yarn dev
# or
cp .env.example .env.local
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `TMDB_API_KEY` | TMDB v3 API Key | *(Optional in dev - fallback mock enabled)* |
| `TMDB_BASE_URL` | TMDB API base endpoint | `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_BASE_URL` | TMDB Image CDN endpoint | `https://image.tmdb.org/t/p` |
| `STREAMING_PROVIDER` | Active streaming provider (`mock` or `custom`) | `mock` |
| `STREAMING_API_KEY` | Private Streaming API Key | *(Kept securely server-side)* |
| `STREAMING_BASE_URL` | Streaming provider base URL | *(e.g. https://api.streamprovider.com)* |
| `NEXT_PUBLIC_SITE_NAME` | Site branding name | `gorib.lol` |
| `NEXT_PUBLIC_SITE_URL` | Public site domain | `http://localhost:3000` |
| `NEXT_PUBLIC_AD_SLOTS_ENABLED` | Enable sponsored ad placeholders | `false` |

---

## 6. Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Start development server:
```bash
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
---

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
## 7. Testing

## Learn More
Run unit, component, and integration tests:

To learn more about Next.js, take a look at the following resources:
```bash
pnpm test
```

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
Watch mode for development:
```bash
pnpm test:watch
```

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
Tests cover:
- TMDB payload normalization (handling missing posters, missing runtimes, cast extraction).
- Stream source URL validation and security (rejecting script injection and unsafe protocols).
- Streaming provider abstraction and ID resolution.
- Zero-CLS AdSlot rendering when disabled.
- MediaCard formatting and action routing.

## Deploy on Vercel
---

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
## 8. Production Build

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
To create an optimized production build:

```bash
pnpm build
```

To run the production server:

```bash
pnpm start
```

---

## 9. Streaming Provider Integration

To connect your real streaming API provider:
1. Open `.env.local`.
2. Set `STREAMING_PROVIDER=custom`.
3. Set your `STREAMING_API_KEY` and `STREAMING_BASE_URL`.
4. The adapter at [`src/lib/api/streaming/customProvider.ts`](file:///G:/Main2/gorib-site/src/lib/api/streaming/customProvider.ts) handles movie and TV episode resolution with automatic stream validation and server mirror fallback.

---

## 10. Troubleshooting

- **Images not loading**: Ensure `image.tmdb.org` is configured in `next.config.ts` under `images.remotePatterns`.
- **429 Rate Limits**: The TMDB client includes automatic caching (`revalidate: 3600`) and safe degradation to cached/mock datasets if rate limits are hit.
- **HLS playback issue**: Check browser developer console. `VideoPlayer` automatically tests `Hls.isSupported()`, falls back to native Safari HLS, and offers mirror server switching on playback failure.
