"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Cart, CartItem } from "@/types";

interface CartContextValue {
  items:        CartItem[];
  itemCount:    number;
  totalInr:     number;    // paise
  addItem:      (item: CartItem) => void;
  removeItem:   (variantId: string) => void;
  updateQty:    (variantId: string, qty: number) => void;
  clearCart:    () => void;
}

const CartCtx = createContext<CartContextValue>({
  items: [], itemCount: 0, totalInr: 0,
  addItem: () => {}, removeItem: () => {}, updateQty: () => {}, clearCart: () => {},
});

const STORAGE_KEY = "an_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Cart = JSON.parse(raw);
        setItems(parsed.items ?? []);
      }
    } catch {}
  }, []);

  // Persist on change
  useEffect(() => {
    const cart: Cart = { items, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [items]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const updateQty = useCallback((variantId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
    } else {
      setItems((prev) => prev.map((i) => i.variantId === variantId ? { ...i, quantity: qty } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalInr  = items.reduce((sum, i) => sum + i.unitPriceInr * i.quantity, 0);

  return (
    <CartCtx.Provider value={{ items, itemCount, totalInr, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() { return useContext(CartCtx); }
