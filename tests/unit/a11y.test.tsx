/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "@/components/layout/Header";
import { ZoomModal } from "@/components/product/ZoomModal";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { CartProvider } from "@/components/cart/CartContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("Accessibility & Ergonomics AA Compliance (S26 / PRD-F17)", () => {
  it("renders accessible skip link targeting #main-content in Header", () => {
    render(
      <WishlistProvider>
        <CartProvider>
          <Header />
        </CartProvider>
      </WishlistProvider>
    );

    const skipLink = screen.getByRole("link", { name: /skip to primary content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(skipLink).toHaveClass("skip-to-content");
  });

  it("ZoomModal conforms to WAI-ARIA dialog pattern (role=dialog, aria-modal=true)", () => {
    const triggerRef = { current: document.createElement("button") };
    document.body.appendChild(triggerRef.current);
    triggerRef.current.focus();

    const onClose = vi.fn();
    const media = [
      {
        id: "m1",
        url: "https://example.com/ring.jpg",
        altText: "18K Gold Solitaire Ring",
        displayOrder: 0,
        isPrimary: true,
        isHoverImage: false,
      },
    ];

    const { unmount } = render(
      <ZoomModal
        isOpen={true}
        onClose={onClose}
        media={media}
        initialIndex={0}
        productTitle="18K Gold Solitaire Ring"
        triggerElementRef={triggerRef}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");

    // Close on Escape key press
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();

    unmount();
    document.body.removeChild(triggerRef.current);
  });

  it("Header navigation elements possess accessible labels and interactive buttons", () => {
    render(
      <WishlistProvider>
        <CartProvider>
          <Header />
        </CartProvider>
      </WishlistProvider>
    );

    // Verify main brand link has label
    const brandLink = screen.getByRole("link", { name: /chudiwalas/i });
    expect(brandLink).toBeInTheDocument();

    // Verify wishlist button has accessible label
    const wishlistLink = screen.getByRole("link", { name: /wishlist/i });
    expect(wishlistLink).toBeInTheDocument();

    // Verify bag button has accessible label
    const bagButton = screen.getByRole("button", { name: /bag/i });
    expect(bagButton).toBeInTheDocument();
  });
});
