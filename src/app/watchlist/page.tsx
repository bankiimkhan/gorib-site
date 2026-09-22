import React from "react";
import { Metadata } from "next";
import { WatchlistClient } from "./WatchlistClient";

export const metadata: Metadata = {
  title: "My List — Saved Movies & TV Shows",
  description: "Access your device-local watchlist of saved cinema and series on gorib.lol.",
};

export default function WatchlistPage() {
  return <WatchlistClient />;
}

