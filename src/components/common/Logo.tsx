import React from "react";
import Link from "next/link";

/** Text wordmark used in the header and footer. */
export function Logo({ onClick, className = "" }: { onClick?: () => void; className?: string }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="gorib.lol home"
      className={`inline-flex items-baseline text-[1.35rem] font-black uppercase leading-none tracking-tight sm:text-2xl ${className}`}
    >
      <span className="text-accent">Gorib</span>
      <span className="text-white/90">.lol</span>
    </Link>
  );
}
