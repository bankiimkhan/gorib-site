import {
  getTrending,
  getNowPlayingMovies,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  getBanglaMovies,
  getHindiMovies,
  getSouthIndianMovies,
  getKoreanDramas,
  getAnime,
  discoverMovies,
} from "@/lib/api/tmdb/client";
import { HeroCarousel } from "@/components/common/HeroCarousel";
import { MediaRow } from "@/components/common/MediaRow";
import { ContinueWatchingRow } from "@/components/common/ContinueWatchingRow";
import { AdSlot } from "@/components/ads/AdSlot";

export const revalidate = 3600; // Revalidate home page every hour

const GENRE_ACTION = 28;
const GENRE_COMEDY = 35;

export default async function HomePage() {
  const [
    trending,
    latestReleases,
    banglaMovies,
    hindiMovies,
    southIndianMovies,
    popularMovies,
    popularTV,
    koreanDramas,
    anime,
    topRatedMovies,
    topRatedTV,
    actionMovies,
    comedyMovies,
  ] = await Promise.all([
    getTrending("all", "day"),
    getNowPlayingMovies(1),
    getBanglaMovies(1),
    getHindiMovies(1),
    getSouthIndianMovies(1),
    getPopularMovies(1),
    getPopularTV(1),
    getKoreanDramas(1),
    getAnime(1),
    getTopRatedMovies(1),
    getTopRatedTV(1),
    discoverMovies({ genreId: GENRE_ACTION, sortBy: "popularity.desc" }),
    discoverMovies({ genreId: GENRE_COMEDY, sortBy: "popularity.desc" }),
  ]);

  return (
    <div className="flex min-h-screen flex-col pb-12">
      <h1 className="sr-only">Home</h1>

      <HeroCarousel items={latestReleases.items} label="New releases" />

      <div className="relative z-10 -mt-14 space-y-1 sm:-mt-24 sm:space-y-2">
        <ContinueWatchingRow />

        <MediaRow
          title="Top 10 Today"
          items={trending.slice(0, 10)}
          viewAllHref="/trending"
          priorityCount={4}
          ranked
        />

        <MediaRow title="New in Cinemas" items={latestReleases.items.slice(5)} viewAllHref="/movies?sort=primary_release_date.desc" />

        <AdSlot placement="home-top" />

        <MediaRow title="Bangla Cinema" items={banglaMovies.items} viewAllHref="/movies?language=bn" />
        <MediaRow title="Binge-Worthy Series" items={popularTV.items} viewAllHref="/tv" />
        <MediaRow title="Bollywood" items={hindiMovies.items} viewAllHref="/movies?language=hi" />
        <MediaRow title="Action & Adventure" items={actionMovies.items} viewAllHref="/genre/action" />

        {/* Between content sections */}
        <AdSlot placement="home-feed" />

        <MediaRow title="South Indian Hits" items={southIndianMovies.items} viewAllHref="/movies?language=south" />
        <MediaRow title="K-Drama" items={koreanDramas.items} viewAllHref="/tv?language=ko&genre=18" />
        <MediaRow title="Comedy" items={comedyMovies.items} viewAllHref="/genre/comedy" />
        <MediaRow title="Anime" items={anime.items} viewAllHref="/tv?language=ja&genre=16" />
        <MediaRow title="Popular Movies" items={popularMovies.items} viewAllHref="/movies" />
        <MediaRow
          title="Critically Acclaimed Movies"
          items={topRatedMovies.items}
          viewAllHref="/movies?sort=vote_average.desc"
        />
        <MediaRow title="Top Rated Series" items={topRatedTV.items} viewAllHref="/tv?sort=vote_average.desc" />
      </div>
    </div>
  );
}
