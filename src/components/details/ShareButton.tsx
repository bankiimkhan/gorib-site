"use client";

import React, { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Native share sheet where available (mobile), otherwise copies the page link. */
export function ShareButton({ title, className = "" }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed or clipboard blocked: nothing to do.
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`btn-icon h-11 w-11 sm:h-12 sm:w-12 ${className}`}
      aria-label={`Share ${title}`}
      title={copied ? "Link copied" : "Share"}
    >
      {copied ? <Check className="h-5 w-5 text-success" aria-hidden="true" /> : <Share2 className="h-5 w-5" aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </button>
  );
}
