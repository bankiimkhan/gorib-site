"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export function AnalyticsLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/analytics/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        setError("That access token is not valid.");
        return;
      }
      setToken("");
      router.refresh();
    } catch {
      setError("Unable to verify the access token. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="shell flex min-h-[70vh] max-w-md items-center justify-center py-24">
      <section className="panel w-full p-7 sm:p-9" aria-labelledby="analytics-access-heading">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 id="analytics-access-heading" className="mt-5 text-2xl font-bold text-white">
          Private analytics
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          This dashboard is restricted to the site owner.
        </p>

        {configured ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-fg" htmlFor="analytics-token">
              Owner access token
            </label>
            <input
              id="analytics-token"
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="input w-full"
              required
            />
            {error && <p className="text-sm text-red-300" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? "Checking…" : "Open analytics"}
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-md border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-relaxed text-amber-100">
            Analytics access has not been configured. Add <code>ANALYTICS_ADMIN_TOKEN</code> as a private deployment secret,
            then return here to sign in.
          </p>
        )}
      </section>
    </div>
  );
}
