/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Header } from "@/components/layout/Header";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { CartProvider } from "@/components/cart/CartContext";
import { CATEGORIES } from "@/lib/categories";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const COLLECTIONS = [
  { slug: "royal-polki-heritage", title: "Royal Polki Heritage", bannerImageUrl: null },
  { slug: "bridal-connoisseur", title: "Bridal Connoisseur", bannerImageUrl: null },
];

function renderHeader(collections = COLLECTIONS) {
  return render(
    <WishlistProvider>
      <CartProvider>
        <Header categories={CATEGORIES} collections={collections} />
      </CartProvider>
    </WishlistProvider>
  );
}

describe("Header navigation menus (Category / Collections)", () => {
  it("keeps both mega menus closed until the trigger is used", () => {
    renderHeader();
    const trigger = screen.getByRole("button", { name: "Category" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Shop by category")).not.toBeInTheDocument();
  });

  it("lists every registered category under the Category menu", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Category" }));

    expect(screen.getByText("Shop by category")).toBeInTheDocument();
    for (const category of CATEGORIES) {
      const link = screen.getByRole("link", { name: category.label });
      expect(link).toHaveAttribute("href", `/shop?category=${category.slug}`);
    }
    expect(screen.getByRole("button", { name: "Category" })).toHaveAttribute("aria-expanded", "true");
  });

  it("lists the admin's collections under the Collections menu", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Collections" }));

    expect(screen.getByText("Shop by collection")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Royal Polki Heritage" })).toHaveAttribute(
      "href",
      "/collections/royal-polki-heritage"
    );
    expect(screen.getByRole("link", { name: "Bridal Connoisseur" })).toHaveAttribute(
      "href",
      "/collections/bridal-connoisseur"
    );
    expect(screen.getByRole("link", { name: /all collections/i })).toHaveAttribute("href", "/collections");
  });

  it("opens one menu at a time and closes on Escape", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Category" }));
    fireEvent.click(screen.getByRole("button", { name: "Collections" }));

    expect(screen.queryByText("Shop by category")).not.toBeInTheDocument();
    expect(screen.getByText("Shop by collection")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Shop by collection")).not.toBeInTheDocument();
  });

  it("falls back to a browse link when no collection is published", () => {
    renderHeader([]);
    fireEvent.click(screen.getByRole("button", { name: "Collections" }));
    expect(screen.getByText(/no collections are published yet/i)).toBeInTheDocument();
  });

  it("exposes Category and Collections as accordions in the mobile drawer", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));

    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(drawer).toBeInTheDocument();

    // The Category accordion starts open; its links are the registry's.
    const categoryNav = screen.getByRole("navigation", { name: "Categories" });
    expect(categoryNav.querySelectorAll("a")).toHaveLength(CATEGORIES.length);

    fireEvent.click(within(drawer).getByRole("button", { name: "Collections" }));
    const collectionsNav = screen.getByRole("navigation", { name: "Collections" });
    // One link per collection, plus "All collections".
    expect(collectionsNav.querySelectorAll("a")).toHaveLength(COLLECTIONS.length + 1);
  });
});
