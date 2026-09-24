import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { StickyBottomAd } from "@/components/ads/StickyBottomAd";
import { AdRuntime } from "@/components/ads/AdRuntime";

const uiFont = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "gorib.lol";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gorib.lol";
const description =
  "Stream the latest movies and popular TV series in HD, with personalised discovery, subtitles, and a distraction-free player.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0c0c0e",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Movies & TV Streaming`,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: ["streaming", "movies", "tv shows", "watch online", "hd streaming"],
  authors: [{ name: siteName }],
  openGraph: {
    type: "website",
    siteName,
    title: `${siteName} — Movies & TV Streaming`,
    description,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — Movies & TV Streaming`,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${uiFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-fg">
        <a
          href="#main"
          className="btn btn-primary btn-sm fixed left-4 top-3 z-[100] -translate-y-20 focus:translate-y-0"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <StickyBottomAd />
        <AdRuntime />
      </body>
    </html>
  );
}
