import React, { Suspense } from "react";
import { Metadata } from "next";
import { SearchClient } from "./SearchClient";
import { SearchSkeleton } from "@/components/common/Skeleton";

export const metadata: Metadata = {
  title: "Search Movies & TV Shows",
  description: "Find movies, series, actors, and directors across the gorib.lol catalog.",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <SearchSkeleton />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}

