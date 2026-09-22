import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";

// Netflix sets type in the proprietary "Netflix Sans"; Inter is the closest
// open substitute and sits in front of Netflix's own Helvetica fallback chain.
const netflixSans = Inter({
  variable: "--font-netflix-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "gorib.lol — Premium Movies & TV Streaming",
    template: "%s | gorib.lol",
  },
  description:
    "Stream the latest blockbuster movies and popular television series in HD quality with personalized discovery and custom playback.",
  keywords: ["streaming", "movies", "tv shows", "cinema", "watch online", "hd streaming"],
  authors: [{ name: "gorib.lol" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${netflixSans.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#07090e] text-zinc-100 selection:bg-amber-500 selection:text-black">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
