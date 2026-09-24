import { Metadata } from "next";
import { CatalogView } from "@/components/catalog/CatalogView";

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Browse TV series by genre, country, year, language, popularity, and rating.",
};

interface TVPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TVPage({ searchParams }: TVPageProps) {
  return (
    <CatalogView
      type="tv"
      searchParams={await searchParams}
      title="TV Shows"
      subtitle="Acclaimed series, Bangla natok, K-dramas, anime, and new seasons."
    />
  );
}
