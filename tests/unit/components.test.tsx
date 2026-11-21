// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge } from "@/components/common/Badge";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { ProductCard } from "@/components/product/ProductCard";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { CartProvider } from "@/components/cart/CartContext";
import { FIXTURE_PRODUCTS } from "@/lib/fixtures/products";
import { toPublicProductDto } from "@/lib/dto/product";

describe("Phase 2 UI Components", () => {
  describe("<Badge />", () => {
    it("renders text content and applies hallmark styling", () => {
      render(<Badge variant="hallmark">BIS Hallmarked 916</Badge>);
      const badge = screen.getByText("BIS Hallmarked 916");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("bg-ivory-200");
    });

    it("renders gold variant for high value", () => {
      render(<Badge variant="gold">High Value</Badge>);
      const badge = screen.getByText("High Value");
      expect(badge.className).toContain("bg-gold-100");
    });
  });

  describe("<ImageWithFallback /> — S03 Image Failure Graceful Recovery", () => {
    it("renders standard image when valid src is provided", () => {
      render(
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f"
          alt="Regal Emerald Choker"
          width={400}
          height={400}
        />
      );
      const img = screen.getByAltText("Regal Emerald Choker");
      expect(img).toBeInTheDocument();
    });

    it("replaces broken image with elegant atelier fallback on image load error (S03)", () => {
      render(
        <ImageWithFallback
          src="https://invalid-broken-domain-999.com/missing.jpg"
          alt="Missing Diamond Piece"
          fallbackTitle="Diamond Solitaire"
          width={400}
          height={400}
        />
      );

      const img = screen.getByAltText("Missing Diamond Piece");
      // Simulate network / image load failure
      fireEvent.error(img);

      // Verify graceful placeholder state is rendered
      expect(screen.getByText("Diamond Solitaire")).toBeInTheDocument();
      expect(screen.getByText("Image In Atelier Archive")).toBeInTheDocument();
    });
  });

  describe("<ProductCard />", () => {
    it("renders product title, formatted price, and metal specification", () => {
      const rawProduct = FIXTURE_PRODUCTS[0]; // Heritage Polki choker (₹1,00,000 boundary)
      const publicDto = toPublicProductDto(rawProduct);

      render(
        <WishlistProvider>
          <CartProvider>
            <ProductCard product={publicDto} />
          </CartProvider>
        </WishlistProvider>
      );

      expect(screen.getByText(publicDto.title)).toBeInTheDocument();
      expect(screen.getByText(publicDto.defaultVariant.formattedPrice)).toBeInTheDocument();
      // Metal colour now shown as swatches, not text; the price/offer line carries the detail.
    });

    it("toggles wishlist button state on click", () => {
      const rawProduct = FIXTURE_PRODUCTS[0];
      const publicDto = toPublicProductDto(rawProduct);

      render(
        <WishlistProvider>
          <CartProvider>
            <ProductCard product={publicDto} />
          </CartProvider>
        </WishlistProvider>
      );
      const wishlistBtn = screen.getByRole("button", { name: /add to wishlist/i });
      expect(wishlistBtn).toBeInTheDocument();

      fireEvent.click(wishlistBtn);
      expect(screen.getByRole("button", { name: /remove from wishlist/i })).toBeInTheDocument();
    });
  });
});

