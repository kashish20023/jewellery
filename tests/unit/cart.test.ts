import { describe, it, expect, beforeEach } from "vitest";
import {
  addItemToCart,
  updateCartQuantity,
  removeCartItem,
  calculateClientCartTotals,
  CartItem,
} from "@/lib/cart";

describe("Guest Cart Unit Suite (PRD-F10 / S16 / S25)", () => {
  const sampleItem1: Omit<CartItem, "quantity"> = {
    variantId: "var-choker-yg",
    sku: "AUR-CHOK-001-YG",
    productId: "prod-choker",
    productSlug: "royal-polki-choker",
    productTitle: "The Royal Polki Choker",
    metalType: "18K Yellow Gold",
    size: "Standard",
    purity: "750",
    imageUrl: "/images/choker.jpg",
    unitPricePaise: "10000000", // ₹1,00,000
  };

  const sampleItem2: Omit<CartItem, "quantity"> = {
    variantId: "var-solitaire-pt",
    sku: "AUR-SOL-002-PT",
    productId: "prod-solitaire",
    productSlug: "solitaire-ring",
    productTitle: "The Solitaire Diamond Ring",
    metalType: "Platinum 950",
    size: "14",
    purity: "950",
    imageUrl: "/images/ring.jpg",
    unitPricePaise: "25000000", // ₹2,50,000
  };

  it("adds a new item to an empty cart with quantity 1", () => {
    const cart = addItemToCart([], sampleItem1, 1);
    expect(cart).toHaveLength(1);
    expect(cart[0].variantId).toBe("var-choker-yg");
    expect(cart[0].quantity).toBe(1);
  });

  it("increments quantity when the same SKU is added again", () => {
    let cart = addItemToCart([], sampleItem1, 1);
    cart = addItemToCart(cart, sampleItem1, 2);

    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  it("adds distinct variants as separate cart items", () => {
    let cart = addItemToCart([], sampleItem1, 1);
    cart = addItemToCart(cart, sampleItem2, 1);

    expect(cart).toHaveLength(2);
    expect(cart[0].sku).toBe("AUR-CHOK-001-YG");
    expect(cart[1].sku).toBe("AUR-SOL-002-PT");
  });

  it("updates quantity accurately and removes item when quantity <= 0", () => {
    let cart = addItemToCart([], sampleItem1, 2);
    cart = updateCartQuantity(cart, "var-choker-yg", 5);
    expect(cart[0].quantity).toBe(5);

    // Set quantity to 0 -> should remove item
    cart = updateCartQuantity(cart, "var-choker-yg", 0);
    expect(cart).toHaveLength(0);
  });

  it("removes specified item without mutating other items in cart", () => {
    let cart = addItemToCart([], sampleItem1, 1);
    cart = addItemToCart(cart, sampleItem2, 2);

    cart = removeCartItem(cart, "var-choker-yg");
    expect(cart).toHaveLength(1);
    expect(cart[0].variantId).toBe("var-solitaire-pt");
    expect(cart[0].quantity).toBe(2);
  });

  it("calculates optimistic totals with 3% GST and free insured shipping", () => {
    let cart = addItemToCart([], sampleItem1, 1); // ₹1,00,000 (10,000,000 paise)
    cart = addItemToCart(cart, sampleItem2, 1);    // ₹2,50,000 (25,000,000 paise)

    const totals = calculateClientCartTotals(cart);

    expect(totals.itemCount).toBe(2);
    expect(totals.subtotalPaise).toBe(35_000_000n); // ₹3,50,000
    // 3% GST on 35,000,000 = 1,050,000 paise (₹10,500)
    expect(totals.taxPaise).toBe(1_050_000n);
    expect(totals.shippingPaise).toBe(0n); // Free insured shipping
    expect(totals.totalPaise).toBe(36_050_000n); // ₹3,60,500
  });
});

