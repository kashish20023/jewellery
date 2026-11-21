"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  getStoredWishlist,
  addWishlistItem,
  removeWishlistItem,
  toggleWishlistItem,
  setStoredWishlist,
} from "@/lib/wishlist";

interface WishlistContextType {
  wishlist: string[];
  count: number;
  isInWishlist: (productId: string) => boolean;
  toggle: (productId: string) => boolean;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isHydrated: boolean;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlist: [],
  count: 0,
  isInWishlist: () => false,
  toggle: () => false,
  add: () => {},
  remove: () => {},
  clear: () => {},
  isHydrated: false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const stored = getStoredWishlist();
    setWishlist(stored);
    setIsHydrated(true);

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setWishlist(customEvent.detail);
      } else {
        setWishlist(getStoredWishlist());
      }
    };

    window.addEventListener("aurum-wishlist-update", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("aurum-wishlist-update", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  const toggle = useCallback((productId: string) => {
    const { items, isWishlisted } = toggleWishlistItem(productId);
    setWishlist(items);
    return isWishlisted;
  }, []);

  const add = useCallback((productId: string) => {
    const items = addWishlistItem(productId);
    setWishlist(items);
  }, []);

  const remove = useCallback((productId: string) => {
    const items = removeWishlistItem(productId);
    setWishlist(items);
  }, []);

  const clear = useCallback(() => {
    setStoredWishlist([]);
    setWishlist([]);
  }, []);

  const value: WishlistContextType = useMemo(
    () => ({
      wishlist,
      count: wishlist.length,
      isInWishlist,
      toggle,
      add,
      remove,
      clear,
      isHydrated,
    }),
    [wishlist, isInWishlist, toggle, add, remove, clear, isHydrated]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
