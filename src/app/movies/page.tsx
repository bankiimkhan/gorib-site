import { Metadata } from "next";
import { CatalogView } from "@/components/catalog/CatalogView";

export const metadata: Metadata = {
  title: "Movies",
  description: "Browse movies by genre, country, year, language, popularity, and rating.",
};

interface MoviesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
  return (
    <CatalogView
      type="movie"
      searchParams={await searchParams}
      title="Movies"
      subtitle="Blockbusters, regional cinema, indie gems, and classics."
    />
  );
}
