"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Users,
  Repeat,
  Clock,
  Tv,
  Film,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  PlayCircle,
  TrendingUp,
  UserCheck,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { AnalyticsSummary } from "@/lib/analytics/types";
import { usePersonalAnalytics } from "@/lib/analytics/client";

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryQuery, setCountryQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(() => new Date());

  const personal = usePersonalAnalytics();

  // Initial fetch on mount
  useEffect(() => {
    let isMounted = true;
    fetch("/api/analytics", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load analytics");
        return res.json();
      })
      .then((json: AnalyticsSummary) => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
          setLastRefreshedAt(new Date());
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setError("Unable to load analytics at this moment.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Periodic auto-refresh every 15s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetch("/api/analytics", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((json: AnalyticsSummary | null) => {
          if (json) {
            setData(json);
            setLastRefreshedAt(new Date());
          }
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load analytics");
      const json: AnalyticsSummary = await res.json();
      setData(json);
      setError(null);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredCountries = (data?.countries || []).filter((c) => {
    if (!countryQuery.trim()) return true;
    const q = countryQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const top3Countries = (data?.countries || []).slice(0, 3);

  return (
    <div className="min-h-screen pb-24 pt-20 lg:pt-24">
      <div className="shell mx-auto max-w-[1400px]">
        {/* Navigation Breadcrumb / Back button */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="btn btn-ghost btn-sm -ml-2 text-fg-muted transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Home
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`chip ${autoRefresh ? "border-success/50 bg-success/10 text-success hover:border-success" : "text-fg-muted"}`}
              title="Toggle automatic 15-second refresh"
            >
              <span
                className={`h-2 w-2 rounded-full ${autoRefresh ? "animate-pulse bg-success" : "bg-fg-subtle"}`}
              />
              {autoRefresh ? "Live Auto-refresh ON" : "Auto-refresh Paused"}
            </button>

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary btn-sm"
              title="Refresh stats immediately"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="panel relative overflow-hidden p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-success/10 blur-3xl" />

          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-fg-muted">
                <Activity className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Audience & Platform Insights</span>
                <span className="text-line-strong">|</span>
                <span className="flex items-center gap-1.5 text-success">
                  <span className="h-2 w-2 animate-ping rounded-full bg-success opacity-75" />
                  Live Edge
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Analytics & Viewers
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">
                Real-time geographic distribution of viewers, audience retention and repeat streamers,
                total minutes watched, and content consumption trends across the platform.
              </p>
            </div>

            <div className="flex flex-col items-start gap-1 text-xs text-fg-subtle sm:items-end">
              <p>Updated: {lastRefreshedAt.toLocaleTimeString()}</p>
              <p>Location: {data?.clientInfo?.name || "Global"} {data?.clientInfo?.flag || "🌐"}</p>
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading && !data && (
          <div className="mt-12 flex flex-col items-center justify-center py-24 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/20 border-t-accent" />
            <p className="mt-4 text-sm font-medium text-fg-muted">Loading live platform statistics...</p>
          </div>
        )}

        {error && !data && (
          <div className="panel mt-8 p-8 text-center text-fg-muted">
            <p className="text-base font-semibold text-white">Playback & Metrics Error</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="btn btn-primary btn-sm mt-4"
            >
              Try Again
            </button>
          </div>
        )}

        {data && (
          <div className="mt-8 space-y-10">
            {/* 6 Key Performance Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
              {/* Card 1: Watching Now */}
              <div className="panel relative flex flex-col justify-between overflow-hidden p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[11px]">Watching Now</span>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black tabular-nums text-white sm:text-3xl">
                    {data.liveViewers.toLocaleString()}
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">Active streams right now</p>
                </div>
              </div>

              {/* Card 2: Total Visitors */}
              <div className="panel flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[11px]">Total Visitors</span>
                  <Users className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black tabular-nums text-white sm:text-3xl">
                    {data.totalVisitors.toLocaleString()}
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">All-time unique audience</p>
                </div>
              </div>

              {/* Card 3: Repeating Users */}
              <div className="panel flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[11px]">Repeat Streamers</span>
                  <Repeat className="h-4 w-4 text-accent" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black tabular-nums text-white sm:text-3xl">
                      {data.repeatingUsers.repeatRate}%
                    </span>
                    <span className="text-xs text-fg-subtle">
                      ({data.repeatingUsers.returningVisitors.toLocaleString()})
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">Audience returning rate</p>
                </div>
              </div>

              {/* Card 4: Watched Minutes */}
              <div className="panel flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[11px]">Watched Minutes</span>
                  <Clock className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black tabular-nums text-white sm:text-3xl">
                    {data.watchedMinutes.totalMinutes.toLocaleString()}
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    {data.watchedMinutes.totalHours.toLocaleString()} total hours
                  </p>
                </div>
              </div>

              {/* Card 5: Countries Reached */}
              <div className="panel flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[11px]">Countries</span>
                  <Globe className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black tabular-nums text-white sm:text-3xl">
                    {data.countries.length}
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">Global territories reached</p>
                </div>
              </div>

              {/* Card 6: Average Watch Time */}
              <div className="panel flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[11px]">Avg Watch Session</span>
                  <TrendingUp className="h-4 w-4 text-success" aria-hidden="true" />
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black tabular-nums text-white sm:text-3xl">
                    {data.watchedMinutes.averageMinutesPerSession} <span className="text-sm font-normal text-fg-subtle">min</span>
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">Per visitor session</p>
                </div>
              </div>
            </div>

            {/* SECTION 1: Viewers Based on Countries */}
            <section aria-labelledby="countries-heading" className="space-y-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 id="countries-heading" className="section-title flex items-center gap-2">
                    <Globe className="h-5 w-5 text-accent" aria-hidden="true" />
                    <span>Viewers Based on Countries</span>
                  </h2>
                  <p className="mt-1 text-sm text-fg-muted">
                    Geographic distribution of viewers, live concurrent sessions, and regional watched minutes.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                    placeholder="Filter by country or code..."
                    className="input h-9 pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Top 3 Country Highlight Podiums */}
              {!countryQuery && top3Countries.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {top3Countries.map((c, index) => {
                    const badge = index === 0 ? "🥇 Top Viewer Region" : index === 1 ? "🥈 2nd Place" : "🥉 3rd Place";
                    const borderColor =
                      index === 0
                        ? "border-amber-500/40 bg-amber-500/5"
                        : index === 1
                        ? "border-zinc-400/30 bg-zinc-400/5"
                        : "border-amber-700/30 bg-amber-700/5";

                    return (
                      <div
                        key={c.code}
                        className={`panel relative flex flex-col justify-between overflow-hidden p-5 ${borderColor}`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                              {badge}
                            </span>
                            <span className="text-3xl" role="img" aria-label={c.name}>
                              {c.flag}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-bold text-white">
                            {c.name} <span className="text-xs font-normal text-fg-subtle">({c.code})</span>
                          </h3>
                        </div>

                        <div className="mt-4 border-t border-line pt-3">
                          <div className="flex items-baseline justify-between text-sm">
                            <span className="text-fg-muted">Total Viewers:</span>
                            <span className="font-bold tabular-nums text-white">
                              {c.visitors.toLocaleString()} ({c.percentage}%)
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between text-sm">
                            <span className="text-fg-muted">Watched Time:</span>
                            <span className="font-semibold tabular-nums text-fg-muted">
                              {c.watchMinutes.toLocaleString()} mins
                            </span>
                          </div>
                          {c.liveViewers > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                              <span className="h-1.5 w-1.5 rounded-full bg-success" />
                              <span>{c.liveViewers} active now</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Complete Country Breakdown Table */}
              <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-2 text-xs font-semibold uppercase text-fg-subtle">
                        <th className="px-4 py-3 sm:px-6">#</th>
                        <th className="px-4 py-3 sm:px-6">Country</th>
                        <th className="px-4 py-3 sm:px-6">Viewers</th>
                        <th className="px-4 py-3 sm:px-6">Audience Share</th>
                        <th className="px-4 py-3 sm:px-6">Watched Minutes</th>
                        <th className="px-4 py-3 sm:px-6">Active Now</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredCountries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-sm text-fg-subtle">
                            No matching countries found for &ldquo;{countryQuery}&rdquo;
                          </td>
                        </tr>
                      ) : (
                        filteredCountries.map((c, idx) => (
                          <tr
                            key={c.code}
                            className="transition-colors hover:bg-white/[0.02]"
                          >
                            <td className="px-4 py-3.5 text-xs text-fg-subtle sm:px-6">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3.5 sm:px-6">
                              <div className="flex items-center gap-3">
                                <span className="text-xl" role="img" aria-label={c.name}>
                                  {c.flag}
                                </span>
                                <div>
                                  <div className="font-semibold text-white">{c.name}</div>
                                  <div className="text-xs text-fg-subtle">{c.code}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-semibold tabular-nums text-white sm:px-6">
                              {c.visitors.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 sm:px-6">
                              <div className="flex max-w-xs items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                                  <div
                                    className="h-full rounded-full bg-accent"
                                    style={{ width: `${Math.max(2, Math.min(100, c.percentage))}%` }}
                                  />
                                </div>
                                <span className="w-10 text-right text-xs tabular-nums text-fg-muted">
                                  {c.percentage}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-fg-muted sm:px-6">
                              {c.watchMinutes.toLocaleString()} min
                            </td>
                            <td className="px-4 py-3.5 sm:px-6">
                              {c.liveViewers > 0 ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                                  {c.liveViewers}
                                </span>
                              ) : (
                                <span className="text-xs text-fg-subtle">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* SECTION 2: Repeating Users & Retention */}
            <section aria-labelledby="repeating-heading" className="space-y-6">
              <div>
                <h2 id="repeating-heading" className="section-title flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-accent" aria-hidden="true" />
                  <span>Repeating Users & Audience Retention</span>
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Analysis of first-time discoverers vs repeating loyal viewers and stream frequency tiers.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Visual Ratio: New vs Returning */}
                <div className="panel flex flex-col justify-between p-6 sm:p-8">
                  <div>
                    <h3 className="text-base font-bold text-white">Audience Composition</h3>
                    <p className="mt-1 text-xs text-fg-muted">
                      Ratio of viewers who return for multiple streaming sessions vs new visitors.
                    </p>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-white">
                          <span className="h-3 w-3 rounded-full bg-accent" />
                          Returning Viewers ({data.repeatingUsers.repeatRate}% )
                        </span>
                        <span className="flex items-center gap-2 font-medium text-fg-muted">
                          <span className="h-3 w-3 rounded-full bg-white/20" />
                          First-time Visitors ({(100 - data.repeatingUsers.repeatRate).toFixed(1)}%)
                        </span>
                      </div>

                      {/* Stacked Progress Bar */}
                      <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
                        <div
                          className="h-full rounded-l-full bg-accent transition-all duration-500"
                          style={{ width: `${data.repeatingUsers.repeatRate}%` }}
                          title={`Returning: ${data.repeatingUsers.repeatRate}%`}
                        />
                        <div
                          className="h-full rounded-r-full bg-white/20 transition-all duration-500"
                          style={{ width: `${100 - data.repeatingUsers.repeatRate}%` }}
                          title={`New: ${(100 - data.repeatingUsers.repeatRate).toFixed(1)}%`}
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6">
                      <div>
                        <div className="text-xs uppercase text-fg-subtle">Returning Count</div>
                        <div className="mt-1 text-xl font-extrabold text-white">
                          {data.repeatingUsers.returningVisitors.toLocaleString()}
                        </div>
                        <p className="text-xs text-fg-subtle">Streamed 2 or more times</p>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-fg-subtle">New Audience</div>
                        <div className="mt-1 text-xl font-extrabold text-white">
                          {data.repeatingUsers.newVisitors.toLocaleString()}
                        </div>
                        <p className="text-xs text-fg-subtle">First-time visitors</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-md bg-surface-2 p-4 text-xs text-fg-muted">
                    <p className="flex items-center gap-2 font-semibold text-white">
                      <Sparkles className="h-4 w-4 text-accent" />
                      Audience Retention Metric
                    </p>
                    <p className="mt-1">
                      Each visitor participates in an average of{" "}
                      <span className="font-bold text-white">{data.repeatingUsers.averageVisitsPerUser}</span>{" "}
                      sessions across their streaming lifecycle.
                    </p>
                  </div>
                </div>

                {/* Frequency & Loyalty Tiers */}
                <div className="panel p-6 sm:p-8">
                  <h3 className="text-base font-bold text-white">Visit Frequency Breakdown</h3>
                  <p className="mt-1 text-xs text-fg-muted">
                    Categorization of viewers based on the number of sessions recorded.
                  </p>

                  <div className="mt-6 space-y-4">
                    {/* Tier 1: 1 Visit */}
                    <div className="rounded-lg border border-line bg-surface-2 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                            1
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-white">First-time Explorers</div>
                            <div className="text-xs text-fg-subtle">Single session</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            {data.repeatingUsers.frequencyBuckets.single.toLocaleString()}
                          </div>
                          <div className="text-xs text-fg-subtle">
                            {((data.repeatingUsers.frequencyBuckets.single / data.totalVisitors) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tier 2: 2-5 Visits */}
                    <div className="rounded-lg border border-line bg-surface-2 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                            2-5
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-white">Casual Streamers</div>
                            <div className="text-xs text-fg-subtle">2 to 5 visits</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            {data.repeatingUsers.frequencyBuckets.occasional.toLocaleString()}
                          </div>
                          <div className="text-xs text-fg-subtle">
                            {((data.repeatingUsers.frequencyBuckets.occasional / data.totalVisitors) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tier 3: 6-10 Visits */}
                    <div className="rounded-lg border border-line bg-surface-2 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/30 text-xs font-bold text-accent">
                            6-10
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-white">Dedicated Fans</div>
                            <div className="text-xs text-fg-subtle">6 to 10 visits</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            {data.repeatingUsers.frequencyBuckets.frequent.toLocaleString()}
                          </div>
                          <div className="text-xs text-fg-subtle">
                            {((data.repeatingUsers.frequencyBuckets.frequent / data.totalVisitors) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tier 4: 11+ Visits */}
                    <div className="rounded-lg border border-line bg-surface-2 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/20 text-xs font-bold text-success">
                            11+
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-white">Super Loyal Streamers</div>
                            <div className="text-xs text-fg-subtle">11 or more visits</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">
                            {data.repeatingUsers.frequencyBuckets.loyal.toLocaleString()}
                          </div>
                          <div className="text-xs text-fg-subtle">
                            {((data.repeatingUsers.frequencyBuckets.loyal / data.totalVisitors) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: Watched Minutes & Content Consumption */}
            <section aria-labelledby="watchtime-heading" className="space-y-6">
              <div>
                <h2 id="watchtime-heading" className="section-title flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-accent" aria-hidden="true" />
                  <span>Watched Minutes & Stream Consumption</span>
                </h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Aggregated minutes streamed across Movies, TV Series, and Live TV broadcasts.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Media Type Breakdown Card (Movies vs TV vs Live) */}
                <div className="panel flex flex-col justify-between p-6 sm:p-8 lg:col-span-1">
                  <div>
                    <h3 className="text-base font-bold text-white">Watch Time by Category</h3>
                    <p className="mt-1 text-xs text-fg-muted">
                      Proportion of minutes spent across content categories.
                    </p>

                    <div className="mt-6 space-y-4">
                      {/* Movie Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                          <Film className="h-4 w-4 text-accent" aria-hidden="true" />
                          <span>Movies</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums text-white">
                            {data.watchedMinutes.byType.movie.toLocaleString()} min
                          </div>
                          <div className="text-xs text-fg-subtle">
                            {data.watchedMinutes.byTypePercentage.movie}%
                          </div>
                        </div>
                      </div>

                      {/* TV Show Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                          <Tv className="h-4 w-4 text-sky-400" aria-hidden="true" />
                          <span>TV Series</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums text-white">
                            {data.watchedMinutes.byType.tv.toLocaleString()} min
                          </div>
                          <div className="text-xs text-fg-subtle">
                            {data.watchedMinutes.byTypePercentage.tv}%
                          </div>
                        </div>
                      </div>

                      {/* Live TV Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                          <Radio className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                          <span>Live TV</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold tabular-nums text-white">
                            {data.watchedMinutes.byType.live.toLocaleString()} min
                          </div>
                          <div className="text-xs text-fg-subtle">
                            {data.watchedMinutes.byTypePercentage.live}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Segmented bar */}
                    <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${data.watchedMinutes.byTypePercentage.movie}%` }}
                        title={`Movies: ${data.watchedMinutes.byTypePercentage.movie}%`}
                      />
                      <div
                        className="h-full bg-sky-400"
                        style={{ width: `${data.watchedMinutes.byTypePercentage.tv}%` }}
                        title={`TV: ${data.watchedMinutes.byTypePercentage.tv}%`}
                      />
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${data.watchedMinutes.byTypePercentage.live}%` }}
                        title={`Live: ${data.watchedMinutes.byTypePercentage.live}%`}
                      />
                    </div>
                  </div>

                  <div className="mt-8 border-t border-line pt-4 text-xs text-fg-muted">
                    Total:{" "}
                    <span className="font-bold text-white">
                      {data.watchedMinutes.totalMinutes.toLocaleString()} minutes
                    </span>{" "}
                    ({data.watchedMinutes.totalHours.toLocaleString()} hours)
                  </div>
                </div>

                {/* Top Watched Content Table */}
                <div className="panel p-6 sm:p-8 lg:col-span-2">
                  <h3 className="text-base font-bold text-white">Most Watched Streams</h3>
                  <p className="mt-1 text-xs text-fg-muted">
                    Top titles and channels with highest watch engagement.
                  </p>

                  <div className="mt-4 divide-y divide-line">
                    {data.watchedMinutes.topTitles.length === 0 ? (
                      <p className="py-6 text-center text-sm text-fg-subtle">
                        No watch activity recorded yet.
                      </p>
                    ) : (
                      data.watchedMinutes.topTitles.map((item, idx) => {
                        const typeBadge =
                          item.mediaType === "movie"
                            ? "bg-accent/15 text-accent border-accent/20"
                            : item.mediaType === "tv"
                            ? "bg-sky-500/15 text-sky-400 border-sky-500/20"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";

                        const typeLabel =
                          item.mediaType === "movie"
                            ? "Movie"
                            : item.mediaType === "tv"
                            ? "TV Show"
                            : "Live TV";

                        return (
                          <div
                            key={`${item.title}-${idx}`}
                            className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 text-xs font-semibold text-fg-subtle">
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="text-sm font-semibold text-white">{item.title}</div>
                                <span
                                  className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${typeBadge}`}
                                >
                                  {typeLabel}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm font-bold tabular-nums text-white">
                                {item.watchMinutes.toLocaleString()} min
                              </div>
                              <div className="text-xs text-fg-subtle">
                                {item.views.toLocaleString()} viewers
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: Your Personal Session Activity */}
            <section aria-labelledby="personal-heading">
              <div className="panel border-line-strong bg-gradient-to-r from-surface to-surface-2 p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-fg-muted">
                      <UserCheck className="h-3.5 w-3.5 text-success" />
                      <span>Your Device Activity</span>
                    </div>
                    <h3 id="personal-heading" className="mt-2 text-xl font-bold text-white">
                      Your Streaming Contribution
                    </h3>
                    <p className="mt-1 text-sm text-fg-muted">
                      Metrics recorded from this browser session.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-line bg-surface p-3.5">
                      <div className="text-xs text-fg-subtle">Your Region</div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-white">
                        <span>{personal.countryFlag}</span>
                        <span>{personal.countryName}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-line bg-surface p-3.5">
                      <div className="text-xs text-fg-subtle">Visitor Status</div>
                      <div className="mt-1 text-sm font-bold text-white">
                        {personal.isReturning ? (
                          <span className="text-success">Returning (Visit #{personal.visitCount})</span>
                        ) : (
                          <span className="text-fg-muted">First-time Visitor</span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 rounded-lg border border-line bg-surface p-3.5 sm:col-span-1">
                      <div className="text-xs text-fg-subtle">Your Watched Time</div>
                      <div className="mt-1 text-sm font-bold text-white">
                        {personal.watchMinutes} minutes
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 border-t border-line pt-4 text-xs text-fg-subtle">
                  <ShieldCheck className="h-4 w-4 text-success" />
                  <span>
                    Privacy guarantee: Zero invasive tracking cookies. All metrics are aggregated anonymously
                    for site reliability and audience transparency.
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
