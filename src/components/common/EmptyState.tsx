import React from "react";
import Link from "next/link";
import { Film, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
  /** Label for the action; renders a link with `actionHref` or a button with `onAction`. */
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = "Nothing here yet",
  message = "We couldn't find anything matching your request.",
  icon: Icon = Film,
  actionText,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center px-4 py-20 text-center">
      <Icon className="mb-5 h-12 w-12 text-fg-subtle" strokeWidth={1.5} aria-hidden="true" />
      <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-fg-muted sm:text-base">{message}</p>
      {actionText && actionHref && (
        <Link href={actionHref} className="btn btn-primary mt-7">
          {actionText}
        </Link>
      )}
      {actionText && !actionHref && onAction && (
        <button type="button" onClick={onAction} className="btn btn-primary mt-7">
          {actionText}
        </button>
      )}
    </div>
  );
}
