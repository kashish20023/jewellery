// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JewelleryBox } from "@/components/jewellery-box/JewelleryBox";
import { LotusMotif } from "@/components/jewellery-box/LotusMotif";

const defaultMockImage = {
  src: "/products/polki-jhumka.webp",
  alt: "Polki jhumka earrings",
  href: "/collections/polki",
};

describe("<JewelleryBox />", () => {
  it("renders with single hero product image and default typography", () => {
    render(<JewelleryBox image={defaultMockImage} />);

    const rootButton = screen.getByRole("button", {
      name: /Jewellery box\. Hover, tap or press Enter to open\./i,
    });
    expect(rootButton).toBeInTheDocument();
    expect(rootButton).toHaveAttribute("aria-expanded", "false");
    expect(rootButton).toHaveAttribute("data-open", "false");

    // Check default typography
    expect(screen.getByText("NO. 01")).toBeInTheDocument();
    expect(screen.getByText("Jewellery")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("Chudiwalas, Jaipur")).toBeInTheDocument();
    expect(screen.getByText("Heritage in every piece")).toBeInTheDocument();

    // Check single hero image is rendered
    const img = screen.getByAltText("Polki jhumka earrings");
    expect(img).toBeInTheDocument();
  });

  it("renders custom title, number, monogram, and subtitle", () => {
    render(
      <JewelleryBox
        title="Polki Pair"
        number="NO. 01"
        monogram="P"
        subtitle="Heritage Series, 2026"
        tagline="Timeless Elegance"
        image={defaultMockImage}
      />
    );

    expect(screen.getByText("NO. 01")).toBeInTheDocument();
    expect(screen.getByText("Polki Pair")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("Heritage Series, 2026")).toBeInTheDocument();
    expect(screen.getByText("Timeless Elegance")).toBeInTheDocument();
  });

  it("handles keyboard interactions (Enter, Space to toggle; Escape to close)", () => {
    render(<JewelleryBox image={defaultMockImage} />);
    const rootButton = screen.getByRole("button");

    // Initially closed
    expect(rootButton).toHaveAttribute("aria-expanded", "false");

    // Press Enter to open
    fireEvent.keyDown(rootButton, { key: "Enter" });
    expect(rootButton).toHaveAttribute("aria-expanded", "true");
    expect(rootButton).toHaveAttribute("data-open", "true");

    // Press Escape to close
    fireEvent.keyDown(rootButton, { key: "Escape" });
    expect(rootButton).toHaveAttribute("aria-expanded", "false");

    // Press Space to open
    fireEvent.keyDown(rootButton, { key: " " });
    expect(rootButton).toHaveAttribute("aria-expanded", "true");

    // Press Space again to toggle closed
    fireEvent.keyDown(rootButton, { key: " " });
    expect(rootButton).toHaveAttribute("aria-expanded", "false");
  });

  it("handles mouse click/tap toggling", () => {
    render(<JewelleryBox image={defaultMockImage} />);
    const rootButton = screen.getByRole("button");

    expect(rootButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(rootButton);
    expect(rootButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(rootButton);
    expect(rootButton).toHaveAttribute("aria-expanded", "false");
  });

  it("configures link tabIndex based on open/closed state", () => {
    render(<JewelleryBox image={defaultMockImage} />);
    const rootButton = screen.getByRole("button");

    // When closed, link inside is tabIndex -1
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("tabindex", "-1");

    // When open, link inside is tabIndex 0
    fireEvent.click(rootButton);
    expect(link).toHaveAttribute("tabindex", "0");
  });
});

describe("<LotusMotif />", () => {
  it("renders pure vector lotus paths without errors", () => {
    const { container } = render(<LotusMotif className="test-lotus" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("test-lotus");
  });
});
