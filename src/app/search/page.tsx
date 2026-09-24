import React, { Suspense } from "react";
import { Metadata } from "next";
import { SearchClient } from "./SearchClient";
import { PosterGridSkeleton } from "@/components/common/Skeleton";

export const metadata: Metadata = {
  title: "Search Movies & TV Shows",
  description: "Find movies, series, actors, and directors across the gorib.lol catalog.",
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="shell pb-16 pt-44">
          <PosterGridSkeleton count={16} />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}

