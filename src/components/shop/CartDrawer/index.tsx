"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/shop/Cart/CartContext";
import { Button } from "@/components/ui/Button";
import styles from "./CartDrawer.module.css";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, itemCount, totalInr, updateQty, removeItem } = useCart();

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else        document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} aria-hidden />

      {/* Drawer */}
      <div className={styles.drawer} role="dialog" aria-label="Shopping cart">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            Cart
            {itemCount > 0 && <span className={styles.count}>{itemCount}</span>}
          </h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close cart">✕</button>
        </div>

        {/* Items */}
        <div className={styles.body}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🛒</span>
              <p>Your cart is empty</p>
              <Button variant="secondary" size="sm" onClick={onClose}>
                <Link href="/shop">Shop Now</Link>
              </Button>
            </div>
          ) : (
            <ul className={styles.itemList}>
              {items.map((item) => (
                <li key={item.variantId} className={styles.item}>
                  {/* Product image */}
                  <div className={styles.itemImage}>
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill className={styles.img} sizes="64px" />
                    ) : (
                      <span className={styles.imgPlaceholder}>🍯</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className={styles.itemDetails}>
                    <Link href={`/shop/${item.slug}`} className={styles.itemName} onClick={onClose}>
                      {item.productName}
                    </Link>
                    <p className={styles.itemVariant}>{item.variantName}</p>
                    <p className={styles.itemPrice}>
                      ₹{(item.unitPriceInr / 100).toLocaleString("en-IN")} × {item.quantity}
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div className={styles.itemActions}>
                    <div className={styles.qtyControl}>
                      <button
                        onClick={() => updateQty(item.variantId, item.quantity - 1)}
                        className={styles.qtyBtn}
                        aria-label="Decrease"
                      >−</button>
                      <span className={styles.qtyNum}>{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.variantId, item.quantity + 1)}
                        className={styles.qtyBtn}
                        aria-label="Increase"
                      >+</button>
                    </div>
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className={styles.removeBtn}
                      aria-label="Remove"
                    >🗑</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.subtotal}>
              <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
              <span className={styles.subtotalAmt}>₹{(totalInr / 100).toLocaleString("en-IN")}</span>
            </div>
            <p className={styles.shippingNote}>Shipping calculated at checkout</p>
            <Link href="/checkout" onClick={onClose}>
              <Button variant="primary" size="lg" className={styles.checkoutBtn}>
                Proceed to Checkout →
              </Button>
            </Link>
            <button onClick={onClose} className={styles.continueBtn}>Continue Shopping</button>
          </div>
        )}
      </div>
    </>
  );
}
