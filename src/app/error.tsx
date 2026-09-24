"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex min-h-[75vh] flex-col items-center justify-center pt-24 text-center">
      <p className="eyebrow text-accent">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">We couldn&apos;t load this page</h1>
      <p className="mt-3 max-w-md text-base text-fg-muted">
        This is usually temporary. Try again, or head back to browsing.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-primary">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
