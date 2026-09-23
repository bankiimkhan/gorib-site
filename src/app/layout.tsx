import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { StickyBottomAd } from "@/components/ads/StickyBottomAd";

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
        <StickyBottomAd />
        {process.env.NEXT_PUBLIC_ADS_ENABLED === "true" &&
          process.env.NEXT_PUBLIC_AD_PROVIDER === "custom" &&
          process.env.NEXT_PUBLIC_CUSTOM_AD_SCRIPT_URL && (
            <Script
              id="ad-network-multitag"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(ghy){
var d = document,
    s = d.createElement('script'),
    l = d.currentScript || d.scripts[d.scripts.length - 1];
s.settings = ghy || {};
s.src = ${JSON.stringify(process.env.NEXT_PUBLIC_CUSTOM_AD_SCRIPT_URL)};
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({});`,
              }}
            />
          )}
      </body>
    </html>
  );
}
