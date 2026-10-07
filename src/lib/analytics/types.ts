export interface CountryViewerStat {
  code: string;
  name: string;
  flag: string;
  visitors: number;
  percentage: number;
  watchMinutes: number;
  liveViewers: number;
}

export interface RepeatingUsersStat {
  totalVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  repeatRate: number;
  totalSessions: number;
  averageVisitsPerUser: number;
  frequencyBuckets: {
    single: number;
    occasional: number;
    frequent: number;
    loyal: number;
  };
}

export interface TopWatchedTitle {
  title: string;
  mediaType: "movie" | "tv" | "live";
  watchMinutes: number;
  views: number;
}

export interface WatchedMinutesStat {
  totalMinutes: number;
  totalHours: number;
  byType: {
    movie: number;
    tv: number;
    live: number;
  };
  byTypePercentage: {
    movie: number;
    tv: number;
    live: number;
  };
  averageMinutesPerSession: number;
  topTitles: TopWatchedTitle[];
}

export interface AnalyticsSummary {
  liveViewers: number;
  totalVisitors: number;
  countries: CountryViewerStat[];
  repeatingUsers: RepeatingUsersStat;
  watchedMinutes: WatchedMinutesStat;
  clientInfo?: {
    country: string;
    name: string;
    flag: string;
  };
  lastUpdated: string;
}

export interface PersonalAnalytics {
  visitorId: string;
  visitCount: number;
  isReturning: boolean;
  watchMinutes: number;
  country: string;
  countryName: string;
  countryFlag: string;
}
