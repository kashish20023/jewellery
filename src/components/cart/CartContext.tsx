"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import {
  CartItem,
  ClientCartTotals,
  getStoredCart,
  saveStoredCart,
  addItemToCart,
  updateCartQuantity,
  removeCartItem,
  clearStoredCart,
  calculateClientCartTotals,
} from "@/lib/cart";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totals: ClientCartTotals;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setItems(getStoredCart());
    setIsHydrated(true);

    const handleStorageChange = () => {
      setItems(getStoredCart());
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("aurum_cart_updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("aurum_cart_updated", handleStorageChange);
    };
  }, []);

  const totals = useMemo(() => calculateClientCartTotals(items), [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const updated = addItemToCart(prev, item, quantity);
      saveStoredCart(updated);
      return updated;
    });
    setIsOpen(true); // Automatically open drawer on item add for smooth UX
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) => {
      const updated = updateCartQuantity(prev, variantId, quantity);
      saveStoredCart(updated);
      return updated;
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => {
      const updated = removeCartItem(prev, variantId);
      saveStoredCart(updated);
      return updated;
    });
  }, []);

  const clearCart = useCallback(() => {
    clearStoredCart();
    setItems([]);
  }, []);

  const value: CartContextValue = useMemo(
    () => ({
      items,
      itemCount: isHydrated ? totals.itemCount : 0,
      totals,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      isHydrated,
      totals,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
