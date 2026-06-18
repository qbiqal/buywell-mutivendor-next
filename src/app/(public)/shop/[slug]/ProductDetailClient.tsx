"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/shop/Cart/CartContext";
import { useToast } from "@/components/ui/Toast";
import { ProductCard } from "@/components/shop/ProductCard";
import type { ProductWithVariants } from "@/types";
import { ProductReviews } from "./ProductReviews";
import styles from "./product-detail.module.css";

interface VendorInfo {
  id: number;
  storeName: string | null;
  storeSlug: string | null;
  logoUrl: string | null;
  rating: string | null;
  adminRating: number | null;
}

interface ProductDetailClientProps {
  product: ProductWithVariants & {
    longDesc?: string | null;
    metaTitle?: string | null;
    metaDesc?: string | null;
    sortOrder: number;
    sku: string;
    vendor?: VendorInfo | null;
  };
  related: ProductWithVariants[];
  canEdit?: boolean;
}

export default function ProductDetailClient({ product, related, canEdit = false }: ProductDetailClientProps) {
  const { addItem }             = useCart();
  const { success: showToast }  = useToast();
  const router                  = useRouter();
  const thumbRailRef = useRef<HTMLDivElement>(null);

  const activeVariants = product.variants.filter((v) => v.isActive);
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [qty,          setQty]          = useState(1);

  // Vendor rating state
  const [ratingOpen,    setRatingOpen]    = useState(false);
  const [myRating,      setMyRating]      = useState(0);
  const [myReview,      setMyReview]      = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [vendorRating,  setVendorRating]  = useState(product.vendor?.rating ?? "0.00");
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setIsLoggedIn(true);
      if (product.vendor?.storeSlug && d.user) {
        fetch(`/api/vendors/${product.vendor.storeSlug}/rate`).then(r => r.json()).then(rd => {
          if (rd.myRating) { setMyRating(rd.myRating.rating); setMyReview(rd.myRating.review ?? ""); }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [product.vendor?.storeSlug]);

  const variant     = activeVariants[selectedIdx];
  const images    = product.images;
  // Use variant-specific image if set, otherwise fall back to gallery
  const displayImageUrl = (variant as (typeof variant & { imageUrl?: string | null }) | undefined)?.imageUrl;
  const activeImg = displayImageUrl ? { url: displayImageUrl, alt: variant?.name ?? product.name, id: "variant-img" } : (images[activeImgIdx] ?? images[0] ?? null);

  const discount = variant?.mrpInr && variant.mrpInr > variant.priceInr
    ? Math.round(((variant.mrpInr - variant.priceInr) / variant.mrpInr) * 100)
    : 0;

  function handleAddToCart() {
    if (!variant) return;
    addItem({
      variantId:    variant.id,
      productId:    product.id,
      productName:  product.name,
      variantName:  variant.name,
      imageUrl:     images[0]?.url,
      slug:         product.slug,
      quantity:     qty,
      unitPriceInr: variant.priceInr,
    });
    showToast(`${product.name} (${variant.name}) × ${qty} added to cart`);
  }

  function handleBuyNow() {
    if (!variant) return;
    addItem({
      variantId:    variant.id,
      productId:    product.id,
      productName:  product.name,
      variantName:  variant.name,
      imageUrl:     images[0]?.url,
      slug:         product.slug,
      quantity:     qty,
      unitPriceInr: variant.priceInr,
    });
    router.push("/checkout");
  }

  async function submitVendorRating() {
    if (!product.vendor?.storeSlug || myRating < 1) return;
    setRatingLoading(true);
    try {
      const res = await fetch(`/api/vendors/${product.vendor.storeSlug}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: myRating, review: myReview || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Thank you for rating this vendor!");
        setRatingOpen(false);
        if (data.newAverage) setVendorRating(String(data.newAverage));
      }
    } finally {
      setRatingLoading(false);
    }
  }

  function scrollThumbnails(direction: "prev" | "next") {
    thumbRailRef.current?.scrollBy({
      left: direction === "prev" ? -260 : 260,
      behavior: "smooth",
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">Shop</Link>
          <span>/</span>
          <span>{product.name}</span>
          {canEdit && (
            <>
              <span>/</span>
              <Link href={`/admin/products/${product.id}/edit`} className={styles.editCrumb}>Edit Product</Link>
            </>
          )}
        </nav>

        {/* Main content */}
        <div className={styles.main}>
          {/* Image gallery */}
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              {activeImg?.url ? (
                <Image
                  src={activeImg.url}
                  alt={activeImg.alt ?? product.name}
                  fill
                  className={styles.mainImg}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className={styles.imgPlaceholder}>
                  <span>🛍️</span>
                </div>
              )}
              {discount > 0 && <span className={styles.discountBadge}>-{discount}% OFF</span>}
              {images.length > 1 && <span className={styles.imageCount}>{activeImgIdx + 1} / {images.length}</span>}
            </div>

            <div className={styles.thumbnailCarousel} aria-label={`${product.name} image gallery`}>
              <button
                type="button"
                className={styles.thumbNav}
                onClick={() => scrollThumbnails("prev")}
                aria-label="Previous product images"
                disabled={images.length <= 4}
              >
                ‹
              </button>
              <div className={styles.thumbnails} ref={thumbRailRef}>
                {images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImgIdx(i)}
                      className={[styles.thumb, i === activeImgIdx ? styles.thumbActive : ""].join(" ")}
                      aria-label={`Show ${product.name} image ${i + 1}`}
                      aria-current={i === activeImgIdx ? "true" : undefined}
                    >
                      {img.url ? (
                        <Image src={img.url} alt={img.alt ?? product.name} fill className={styles.thumbImg} sizes="84px" />
                      ) : (
                        <span className={styles.thumbPlaceholder}>🛍️</span>
                      )}
                    </button>
                  ))}
              </div>
              <button
                type="button"
                className={styles.thumbNav}
                onClick={() => scrollThumbnails("next")}
                aria-label="Next product images"
                disabled={images.length <= 4}
              >
                ›
              </button>
            </div>
          </div>

          {/* Product info */}
          <div className={styles.info}>
            <Badge variant="info" className={styles.catBadge}>
              {product.categoryName ?? product.category}
            </Badge>

            <h1 className={styles.title}>{product.name}</h1>

            {product.vendor?.storeName && (
              <div className={styles.vendorSection}>
                <div className={styles.vendorHeader}>
                  {product.vendor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.vendor.logoUrl} alt={product.vendor.storeName} className={styles.vendorLogo} />
                  ) : (
                    <div className={styles.vendorLogoPlaceholder}>{product.vendor.storeName[0]}</div>
                  )}
                  <div className={styles.vendorInfo}>
                    <span className={styles.vendorLabel}>Sold by</span>
                    <Link href={`/vendors/${product.vendor.storeSlug}`} className={styles.vendorName}>{product.vendor.storeName}</Link>
                    <div className={styles.vendorRatingRow}>
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} className={styles.star} style={{ color: parseFloat(vendorRating) >= s ? "#f59e0b" : "#d1d5db" }}>★</span>
                      ))}
                      <span className={styles.ratingText}>{parseFloat(vendorRating).toFixed(1)}</span>
                      {product.vendor.adminRating != null && (
                        <span className={styles.adminRatingBadge}>Admin: {product.vendor.adminRating}/5</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.rateVendorBtn}
                    onClick={() => {
                      if (!isLoggedIn) { router.push("/login"); return; }
                      setRatingOpen((o) => !o);
                    }}
                  >
                    {myRating > 0 ? "Update Rating" : "Rate Vendor"}
                  </button>
                </div>
                {ratingOpen && (
                  <div className={styles.ratingForm}>
                    <p className={styles.ratingFormTitle}>Your rating for {product.vendor.storeName}</p>
                    <div className={styles.starPicker}>
                      {[1,2,3,4,5].map((s) => (
                        <button key={s} type="button" className={styles.starPickerBtn} onClick={() => setMyRating(s)}>
                          <span style={{ color: myRating >= s ? "#f59e0b" : "#d1d5db", fontSize: "1.75rem" }}>★</span>
                        </button>
                      ))}
                    </div>
                    <textarea
                      className={styles.reviewInput}
                      rows={3}
                      placeholder="Share your experience with this vendor (optional)"
                      value={myReview}
                      onChange={(e) => setMyReview(e.target.value)}
                    />
                    <div className={styles.ratingFormActions}>
                      <button type="button" className={styles.ratingSubmitBtn} onClick={submitVendorRating} disabled={ratingLoading || myRating < 1}>
                        {ratingLoading ? "Submitting…" : "Submit Rating"}
                      </button>
                      <button type="button" className={styles.ratingCancelBtn} onClick={() => setRatingOpen(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {product.description && (
              <p className={styles.desc}>{product.description}</p>
            )}

            {/* Variant selector */}
            {activeVariants.length > 0 && (
              <div className={styles.variantSection}>
                <p className={styles.variantLabel}>Choose Size</p>
                <div className={styles.variantRow}>
                  {activeVariants.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedIdx(i); setQty(1); }}
                      className={[styles.variantBtn, i === selectedIdx ? styles.variantActive : ""].join(" ")}
                    >
                      <span className={styles.variantName}>{v.name}</span>
                      {v.weight && <span className={styles.variantWeight}>{v.weight}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price */}
            {variant && (
              <div className={styles.priceBlock}>
                <div className={styles.priceRow}>
                  <span className={styles.price}>₹{(variant.priceInr / 100).toLocaleString("en-IN")}</span>
                  {variant.mrpInr && variant.mrpInr > variant.priceInr && (
                    <span className={styles.mrp}>₹{(variant.mrpInr / 100).toLocaleString("en-IN")}</span>
                  )}
                  {discount > 0 && (
                    <span className={styles.savings}>Save {discount}%</span>
                  )}
                </div>
                <p className={styles.inclTax}>Inclusive of all taxes. Free shipping above ₹499.</p>
              </div>
            )}

            {/* Stock */}
            {variant && (
              <div className={styles.stockRow}>
                {variant.stock > 10 ? (
                  <span className={styles.inStock}>✓ In Stock</span>
                ) : variant.stock > 0 ? (
                  <span className={styles.lowStock}>⚡ Only {variant.stock} left</span>
                ) : (
                  <span className={styles.outOfStock}>✗ Out of Stock</span>
                )}
              </div>
            )}

            {/* Qty + Add to cart */}
            {variant && variant.stock > 0 && (
              <div className={styles.addRow}>
                <div className={styles.qtyControl}>
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className={styles.qtyBtn}
                    disabled={qty <= 1}
                  >−</button>
                  <span className={styles.qty}>{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(variant.stock, q + 1))}
                    className={styles.qtyBtn}
                    disabled={qty >= variant.stock}
                  >+</button>
                </div>
                <Button variant="primary" size="lg" onClick={handleAddToCart} className={styles.addBtn}>
                  Add to Cart
                </Button>
                <Button variant="secondary" size="lg" onClick={handleBuyNow} className={styles.buyNowBtn}>
                  Buy Now — ₹{((variant.priceInr * qty) / 100).toLocaleString("en-IN")}
                </Button>
              </div>
            )}

            {/* Trust badges */}
            <div className={styles.trustBadges}>
              <div className={styles.trustItem}><span>🌿</span><span>100% Natural</span></div>
              <div className={styles.trustItem}><span>🔬</span><span>Lab Tested</span></div>
              <div className={styles.trustItem}><span>🚚</span><span>Pan India Shipping</span></div>
              <div className={styles.trustItem}><span>↩️</span><span>Easy Returns</span></div>
            </div>
          </div>
        </div>

        {/* Long description */}
        {product.longDesc && (
          <div className={styles.longDesc}>
            <h2 className={styles.sectionTitle}>About this Product</h2>
            <div
              className={styles.richContent}
              dangerouslySetInnerHTML={{ __html: product.longDesc }}
            />
          </div>
        )}

        <ProductReviews slug={product.slug} />

        {/* Related products */}
        {related.length > 0 && (
          <div className={styles.related}>
            <h2 className={styles.sectionTitle}>You might also like</h2>
            <div className={styles.relatedGrid}>
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
