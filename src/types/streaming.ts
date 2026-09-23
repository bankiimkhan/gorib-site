import { MediaType } from "./media";

export type StreamFormat = "hls" | "mp4" | "webm" | "iframe";

export interface SubtitleTrack {
  label: string;
  language: string;
  url: string;
  default?: boolean;
}

export interface AudioTrack {
  id: string | number;
  label: string;
  language: string;
  default?: boolean;
  isDub?: boolean;
  channels?: number;
  sourceIndex?: number;
}

export interface StreamSource {
  url: string;
  format: StreamFormat;
  quality?: "1080p" | "720p" | "480p" | "360p" | "auto";
  language?: string;
  audioTracks?: AudioTrack[];
  subtitles?: SubtitleTrack[];
  headers?: Record<string, string>;
  serverName?: string;
}

export interface StreamResult {
  mediaId: string;
  type: MediaType;
  title: string;
  season?: number;
  episode?: number;
  sources: StreamSource[];
  defaultSourceIndex: number;
  duration?: number; // duration in seconds if known
  availableSubtitles?: SubtitleTrack[];
  availableAudio?: AudioTrack[];
}

export interface StreamResolutionParams {
  tmdbId: number;
  imdbId?: string;
  type: MediaType;
  title: string;
  year?: number;
  season?: number;
  episode?: number;
}

export interface StreamingProvider {
  readonly id: string;
  readonly name: string;
  getMovieStream(params: {
    tmdbId: number;
    imdbId?: string;
    title: string;
    year?: number;
  }): Promise<StreamResult>;
  getEpisodeStream(params: {
    tmdbId: number;
    imdbId?: string;
    season: number;
    episode: number;
    title: string;
  }): Promise<StreamResult>;
}

