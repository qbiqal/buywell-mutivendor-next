"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/shop/Cart/CartContext";
import { useToast } from "@/components/ui/Toast";
import type { ProductWithVariants } from "@/types";
import styles from "./ProductCard.module.css";

interface ProductCardProps {
  product: ProductWithVariants;
  listMode?: boolean;
}

export function ProductCard({ product, listMode = false }: ProductCardProps) {
  const { addItem }            = useCart();
  const { success: showToast } = useToast();
  const router                 = useRouter();
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  const activeVariants = product.variants.filter((v) => v.isActive);
  const variant        = activeVariants[selectedVariantIdx];
  const primaryImage   = product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url;

  function handleAddToCart() {
    if (!variant) return;
    addItem({
      variantId:    variant.id,
      productId:    product.id,
      productName:  product.name,
      variantName:  variant.name,
      imageUrl:     primaryImage,
      slug:         product.slug,
      quantity:     1,
      unitPriceInr: variant.priceInr,
    });
    showToast(`${product.name} (${variant.name}) added to cart`);
  }

  function handleBuyNow() {
    if (!variant) return;
    addItem({
      variantId:    variant.id,
      productId:    product.id,
      productName:  product.name,
      variantName:  variant.name,
      imageUrl:     primaryImage,
      slug:         product.slug,
      quantity:     1,
      unitPriceInr: variant.priceInr,
    });
    router.push("/checkout");
  }

  const discount = variant?.mrpInr && variant.mrpInr > variant.priceInr
    ? Math.round(((variant.mrpInr - variant.priceInr) / variant.mrpInr) * 100)
    : 0;

  const categoryLabel = product.categoryName ?? product.subCategory ?? product.category ?? "product";

  return (
    <div className={[styles.card, listMode ? styles.listCard : ""].join(" ")}>
      {/* Image */}
      <Link href={`/shop/${product.slug}`} className={[styles.imageWrap, listMode ? styles.listImageWrap : ""].join(" ")}>
        {primaryImage ? (
          <Image src={primaryImage} alt={product.name} fill className={styles.img} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
        ) : (
          <div className={styles.imagePlaceholder}>🛍️</div>
        )}
        {discount > 0 && <span className={styles.discountBadge}>-{discount}%</span>}
        {product.isFeatured && <span className={styles.featuredBadge}>Featured</span>}
      </Link>

      {/* Body */}
      <div className={styles.body}>
        <span className={styles.catBadge}>{categoryLabel}</span>

        <Link href={`/shop/${product.slug}`} className={styles.nameLink}>
          <h3 className={styles.name}>{product.name}</h3>
        </Link>

        <p className={styles.desc}>{product.description}</p>

        {/* Variant selector */}
        {activeVariants.length > 1 && (
          <div className={styles.variants}>
            {activeVariants.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariantIdx(i)}
                className={[styles.variantBtn, i === selectedVariantIdx ? styles.variantActive : ""].join(" ")}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        {/* Price + actions */}
        {variant && (
          <>
            <div className={styles.priceRow}>
              <div className={styles.price}>
                <span className={styles.priceMain}>₹{(variant.priceInr / 100).toLocaleString("en-IN")}</span>
                {variant.mrpInr && variant.mrpInr > variant.priceInr && (
                  <span className={styles.priceMrp}>₹{(variant.mrpInr / 100).toLocaleString("en-IN")}</span>
                )}
              </div>
              {variant.stock <= 5 && variant.stock > 0 && (
                <span className={styles.lowStock}>Only {variant.stock} left</span>
              )}
            </div>
            <div className={styles.cardActions}>
              <Button variant="secondary" size="sm" onClick={handleAddToCart} disabled={variant.stock <= 0} fullWidth>
                {variant.stock <= 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
              {variant.stock > 0 && (
                <Button variant="primary" size="sm" onClick={handleBuyNow} fullWidth>
                  Buy Now
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
