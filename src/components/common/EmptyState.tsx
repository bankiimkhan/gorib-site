import React from "react";
import Link from "next/link";
import { Film, AlertCircle, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  actionHref?: string;
  onRetry?: () => void;
}

export function EmptyState({
  title = "No Content Found",
  message = "We couldn't find anything matching your request.",
  actionText,
  actionHref,
  onRetry,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 mb-4">
        <Film className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="max-w-md text-sm text-zinc-400 mb-6">{message}</p>
      {actionHref && actionText && (
        <Link
          href={actionHref}
          className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
        >
          {actionText}
        </Link>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-full bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Playback Error",
  message = "Unable to play this title right now.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 text-center backdrop-blur-md">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mb-4">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="max-w-sm text-sm text-zinc-400 mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

