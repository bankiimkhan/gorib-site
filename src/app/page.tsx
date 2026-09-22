import {
  getTrending,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  getBanglaMovies,
  getHindiMovies,
  getSouthIndianMovies,
} from "@/lib/api/tmdb/client";
import { HeroBanner } from "@/components/common/HeroBanner";
import { MediaRow } from "@/components/common/MediaRow";
import { ContinueWatchingRow } from "@/components/common/ContinueWatchingRow";
import { AdSlot } from "@/components/ads/AdSlot";
import { LiveTVSpotlight } from "@/components/iptv/LiveTVSpotlight";

export const revalidate = 3600; // Revalidate home page every hour

export default async function HomePage() {
  const [
    trending,
    banglaMovies,
    hindiMovies,
    southIndianMovies,
    popularMovies,
    popularTV,
    topRatedMovies,
    topRatedTV,
  ] = await Promise.all([
    getTrending("all", "day"),
    getBanglaMovies(1),
    getHindiMovies(1),
    getSouthIndianMovies(1),
    getPopularMovies(1),
    getPopularTV(1),
    getTopRatedMovies(1),
    getTopRatedTV(1),
  ]);

  const heroItem = trending[0] || popularMovies.items[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Cinematic Hero */}
      {heroItem && <HeroBanner item={heroItem} />}

      {/* Top Ad Slot */}
      <AdSlot placement="home-top" />

      {/* Local Continue Watching */}
      <ContinueWatchingRow />

      {/* Trending Now */}
      <MediaRow
        title="Trending Today"
        items={trending}
        viewAllHref="/movies"
      />

      {/* Bangla Cinema */}
      {banglaMovies.items.length > 0 && (
        <MediaRow
          title="🇧🇩 Bangla Cinema"
          items={banglaMovies.items}
          viewAllHref="/movies?language=bn"
        />
      )}

      {/* Bollywood Cinema */}
      {hindiMovies.items.length > 0 && (
        <MediaRow
          title="🇮🇳 Bollywood Cinema"
          items={hindiMovies.items}
          viewAllHref="/movies?language=hi"
        />
      )}

      {/* South Indian Cinema */}
      {southIndianMovies.items.length > 0 && (
        <MediaRow
          title="🇮🇳 South Indian Cinema"
          items={southIndianMovies.items}
          viewAllHref="/movies?language=south"
        />
      )}

      {/* Live TV Spotlight */}
      <LiveTVSpotlight />

      {/* Popular Movies */}
      <MediaRow
        title="Popular Movies"
        items={popularMovies.items}
        viewAllHref="/movies?sort=popularity.desc"
      />

      {/* Mid-Feed Ad Slot */}
      <AdSlot placement="home-feed" />

      {/* Popular TV Shows */}
      <MediaRow
        title="Binge-Worthy TV Series"
        items={popularTV.items}
        viewAllHref="/tv?sort=popularity.desc"
      />

      {/* Top Rated Cinema */}
      <MediaRow
        title="Critically Acclaimed Movies"
        items={topRatedMovies.items}
        viewAllHref="/movies?sort=vote_average.desc"
      />

      {/* Top Rated TV */}
      <MediaRow
        title="Top Rated TV Shows"
        items={topRatedTV.items}
        viewAllHref="/tv?sort=vote_average.desc"
      />
    </div>
  );
}
