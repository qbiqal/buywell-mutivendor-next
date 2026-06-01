"use client";

import { useState } from "react";
import styles from "@/components/layout/CustomerHeader/CustomerHeader.module.css";
import { useCart } from "@/components/shop/Cart/CartContext";
import { CartDrawer } from "@/components/shop/CartDrawer";

export function EcommerceHeaderActions() {
  const { itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <button onClick={() => setCartOpen(true)} className={styles.cartBtn} aria-label="Open cart">
        <span className={styles.cartIcon} aria-hidden="true">🛒</span>
        {itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
      </button>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
