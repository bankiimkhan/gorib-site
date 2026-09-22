"use server";

import { getTVSeason } from "@/lib/api/tmdb/client";
import { Season } from "@/types/media";

/**
 * Server action to fetch authentic season episodes from TMDB
 * without exposing or altering any public backend REST endpoints.
 */
export async function fetchSeasonDetailsAction(
  tvId: number,
  seasonNumber: number
): Promise<Season | null> {
  if (isNaN(tvId) || tvId <= 0 || isNaN(seasonNumber) || seasonNumber < 1) {
    return null;
  }

  return await getTVSeason(tvId, seasonNumber);
}

