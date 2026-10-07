import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AnalyticsClient } from "@/app/analytics/AnalyticsClient";

const mockSummary = {
  liveViewers: 12,
  totalVisitors: 450,
  countries: [
    {
      code: "BD",
      name: "Bangladesh",
      flag: "🇧🇩",
      visitors: 200,
      percentage: 44.4,
      watchMinutes: 4000,
      liveViewers: 5,
    },
    {
      code: "US",
      name: "United States",
      flag: "🇺🇸",
      visitors: 150,
      percentage: 33.3,
      watchMinutes: 3000,
      liveViewers: 3,
    },
  ],
  repeatingUsers: {
    totalVisitors: 450,
    newVisitors: 250,
    returningVisitors: 200,
    repeatRate: 44.4,
    totalSessions: 900,
    averageVisitsPerUser: 2.0,
    frequencyBuckets: {
      single: 250,
      occasional: 116,
      frequent: 56,
      loyal: 28,
    },
  },
  watchedMinutes: {
    totalMinutes: 7000,
    totalHours: 116.7,
    byType: {
      movie: 4200,
      tv: 1800,
      live: 1000,
    },
    byTypePercentage: {
      movie: 60.0,
      tv: 25.7,
      live: 14.3,
    },
    averageMinutesPerSession: 8,
    topTitles: [
      {
        title: "Inception",
        mediaType: "movie" as const,
        watchMinutes: 1200,
        views: 80,
      },
    ],
  },
  clientInfo: {
    country: "BD",
    name: "Bangladesh",
    flag: "🇧🇩",
  },
  lastUpdated: new Date().toISOString(),
};

describe("AnalyticsClient Component", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSummary,
      })
    );
  });

  it("renders page header and metric sections", async () => {
    render(<AnalyticsClient />);

    expect(screen.getByRole("heading", { name: /Analytics & Viewers/i })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Viewers Based on Countries/i)).toBeDefined();
    });

    expect(screen.getByText(/Repeating Users & Audience Retention/i)).toBeDefined();
    expect(screen.getByText(/Watched Minutes & Stream Consumption/i)).toBeDefined();
  });

  it("displays country list with viewers and flags", async () => {
    render(<AnalyticsClient />);

    await waitFor(() => {
      expect(screen.getAllByText(/Bangladesh/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/United States/i).length).toBeGreaterThan(0);
    });
  });

  it("displays repeating users percentage and frequency breakdown", async () => {
    render(<AnalyticsClient />);

    await waitFor(() => {
      expect(screen.getAllByText(/44.4%/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Casual Streamers/i)).toBeDefined();
      expect(screen.getByText(/First-time Explorers/i)).toBeDefined();
    });
  });

  it("displays watched minutes by category", async () => {
    render(<AnalyticsClient />);

    await waitFor(() => {
      expect(screen.getByText(/Watch Time by Category/i)).toBeDefined();
      expect(screen.getByText(/Inception/i)).toBeDefined();
    });
  });
});
