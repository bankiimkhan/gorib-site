export interface IPTVChannel {
  id: string;
  name: string;
  rawName: string;
  logo: string;
  group: string;
  url: string;
  country?: string;
  quality?: string;
  isGeoBlocked?: boolean;
  httpFallback?: boolean;
}

export interface IPTVCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface IPTVCountry {
  code: string;
  name: string;
  flag: string;
}

export interface IPTVChannelsResponse {
  channels: IPTVChannel[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  categories: IPTVCategory[];
  countries: IPTVCountry[];
}

