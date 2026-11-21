// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductDetails } from "@/components/product/ProductDetails";
import { CartProvider } from "@/components/cart/CartContext";
import { WishlistProvider } from "@/components/wishlist/WishlistContext";
import { FIXTURE_PRODUCTS } from "@/lib/fixtures/products";
import { toPublicProductDto } from "@/lib/dto/product";

describe("Variant Selector & Real-Time Sync — Smoke Test Matrix S04 Contract", () => {
  it("updates SKU, price and WhatsApp link when metal colour and purity change", () => {
    // Multi-variant fixture: Solitaire Diamond Pendant (YG / RG × 18K / 14K)
    const rawPendant = FIXTURE_PRODUCTS.find((p) => p.slug === "solitaire-diamond-pendant-18k")!;
    expect(rawPendant).toBeDefined();
    expect(rawPendant.variants.length).toBeGreaterThan(1);

    const publicDto = toPublicProductDto(rawPendant);
    expect(publicDto.options.colours).toEqual(["Yellow Gold", "Rose Gold"]);
    expect(publicDto.options.purities).toEqual(["14K", "18K"]);

    render(
      <WishlistProvider>
        <CartProvider>
          <ProductDetails product={publicDto} />
        </CartProvider>
      </WishlistProvider>
    );

    // Open the product details tab (spec sheet with SKU)
    fireEvent.click(screen.getByRole("tab", { name: /product details/i }));

    // Initial state: 18K Yellow Gold active
    expect(screen.getByText("AUR-SOL-002-YG")).toBeInTheDocument();

    // Switch colour to Rose Gold (keeps 18K)
    const roseGoldBtn = screen.getByRole("button", { name: /18k rose gold/i });
    fireEvent.click(roseGoldBtn);
    expect(screen.getByText("AUR-SOL-002-RG")).toBeInTheDocument();

    // Switch purity to 14K (keeps Rose Gold) and the price changes
    fireEvent.click(screen.getByRole("button", { name: /^14K$/ }));
    expect(screen.getByText("AUR-SOL-002-14RG")).toBeInTheDocument();
    expect(screen.getAllByText("₹84,500").length).toBeGreaterThan(0);

    // WhatsApp deep link reflects the active variant
    const whatsappLink = screen.getByRole("link", { name: /chat for purchase assistance on whatsapp/i });
    const decodedHref = decodeURIComponent(whatsappLink.getAttribute("href") || "");
    expect(decodedHref).toContain("AUR-SOL-002-14RG");
    expect(decodedHref).toContain("14K Rose Gold");
  });

  it("redacts compare-at price and breakup for ON_REQUEST pieces", () => {
    const raw = FIXTURE_PRODUCTS.find((p) => p.priceVisibility === "ON_REQUEST")!;
    const dto = toPublicProductDto(raw);
    expect(dto.defaultVariant.compareAtPricePaise).toBeNull();
    expect(dto.defaultVariant.priceBreakup).toBeNull();
    expect(dto.defaultVariant.offerLabel).toBeNull();
  });
});
