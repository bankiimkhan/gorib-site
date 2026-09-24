import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ChannelCard } from "@/components/iptv/ChannelCard";
import { IPTVChannel } from "@/types/iptv";

const sampleChannel: IPTVChannel = {
  id: "ATNBangla.bd@SD",
  name: "ATN Bangla",
  rawName: "ATN Bangla (720p)",
  logo: "https://i.imgur.com/K1HmMRz.png",
  group: "General",
  url: "https://tvsen5.aynascope.net/atnbangla/index.m3u8",
  country: "bd",
  quality: "720P",
};

describe("ChannelCard Component", () => {
  it("renders channel title, group, country, and quality", () => {
    const onSelect = vi.fn();
    const onToggleFavorite = vi.fn();

    const { getByText } = render(
      <ChannelCard
        channel={sampleChannel}
        isActive={false}
        isFavorite={false}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
      />
    );

    expect(getByText("ATN Bangla")).toBeInTheDocument();
    expect(getByText("General")).toBeInTheDocument();
    expect(getByText("bd")).toBeInTheDocument();
    expect(getByText("720P")).toBeInTheDocument();
  });

  it("handles click to select channel", () => {
    const onSelect = vi.fn();
    const onToggleFavorite = vi.fn();

    const { getByText } = render(
      <ChannelCard
        channel={sampleChannel}
        isActive={false}
        isFavorite={false}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
      />
    );

    fireEvent.click(getByText("ATN Bangla"));
    expect(onSelect).toHaveBeenCalledWith(sampleChannel);
  });

  it("handles favorite button toggle without selecting channel", () => {
    const onSelect = vi.fn();
    const onToggleFavorite = vi.fn();

    const { getByRole } = render(
      <ChannelCard
        channel={sampleChannel}
        isActive={false}
        isFavorite={false}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
      />
    );

    const favButton = getByRole("button", { name: /Add ATN Bangla to favorites/i });
    fireEvent.click(favButton);

    expect(onToggleFavorite).toHaveBeenCalledWith("ATNBangla.bd@SD");
    expect(onSelect).not.toHaveBeenCalled();
  });
});

