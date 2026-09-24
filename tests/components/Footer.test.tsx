import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Footer } from "@/components/common/Footer";

describe("Footer Component", () => {
  it("renders full width container with responsive layout classes", () => {
    const { container } = render(<Footer />);
    const footerElement = container.querySelector("footer");
    expect(footerElement).not.toBeNull();
    expect(footerElement?.className).toContain("w-full");

    // Inner content uses the shared page gutter
    const innerContainer = footerElement?.querySelector("div");
    expect(innerContainer?.className).toContain("shell");
  });

  it("renders brand name and description", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /gorib\.lol home/i })).toHaveAttribute("href", "/");
    expect(screen.getByText(/distraction-free player/i)).toBeDefined();
  });

  it("renders explore navigation links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /^movies$/i })).toHaveAttribute("href", "/movies");
    expect(screen.getByRole("link", { name: /^tv shows$/i })).toHaveAttribute("href", "/tv");
    expect(screen.getByRole("link", { name: /live tv/i })).toHaveAttribute("href", "/live-tv");
    expect(screen.getByRole("link", { name: /my list/i })).toHaveAttribute("href", "/watchlist");
  });

  it("renders regional cinema links", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /bangla/i })).toHaveAttribute("href", "/movies?language=bn");
    expect(screen.getByRole("link", { name: /bollywood/i })).toHaveAttribute("href", "/movies?language=hi");
    expect(screen.getByRole("link", { name: /south indian/i })).toHaveAttribute("href", "/movies?language=south");
  });

  it("renders disclaimer and TMDB attribution notices", () => {
    render(<Footer />);
    expect(screen.getByText(/provided by TMDB/i)).toBeDefined();
    expect(screen.getByText(/iptv-org/i)).toBeDefined();
    expect(screen.getByText(/No video files are stored/i)).toBeDefined();
  });

  it("renders copyright with current year", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeDefined();
  });

  it("scrolls to top when clicking back to top button", () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(<Footer />);
    const backToTopBtn = screen.getByRole("button", { name: /back to top/i });
    fireEvent.click(backToTopBtn);

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("renders live viewers counter and does not display non-commercial text", () => {
    render(<Footer />);
    expect(screen.getByText(/watching now/i)).toBeDefined();
    expect(screen.queryByText(/Non-commercial educational demonstration/i)).toBeNull();
  });
});

