"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { MediaUploader, type UploadedFile } from "@/components/media/MediaUploader";
import { NestedCategoryPicker } from "@/components/admin/NestedCategoryPicker";
import { SeoPanel, type SeoPanelValue } from "@/components/admin/SeoPanel";
import { TagSelector } from "@/components/admin/TagSelector";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import styles from "./product-form.module.css";

interface Variant {
  id?: string;
  name: string;
  priceInr: number;
  mrpInr: number;
  weight: string;
  stock: number;
  sku: string;
  isActive: boolean;
}

interface ProductImage {
  id?: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

interface ProductFormClientProps {
  mode: "new" | "edit";
  productId?: string;
}

const EMPTY_VARIANT: Variant = { name: "", priceInr: 0, mrpInr: 0, weight: "", stock: 0, sku: "", isActive: true };

export default function ProductFormClient({ mode, productId }: ProductFormClientProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [loading,  setLoading]  = useState(mode === "edit");
  const [saving,   setSaving]   = useState(false);

  // Product fields
  const [name,        setName]        = useState("");
  const [slug,        setSlug]        = useState("");
  const [category,    setCategory]    = useState("honey");
  const [categoryId,  setCategoryId]  = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState("");
  const [longDesc,    setLongDesc]    = useState("");
  const [sku,         setSku]         = useState("");
  const [isActive,    setIsActive]    = useState(true);
  const [isFeatured,  setIsFeatured]  = useState(false);
  const [sortOrder,   setSortOrder]   = useState(0);
  const [metaTitle,   setMetaTitle]   = useState("");
  const [metaDesc,    setMetaDesc]    = useState("");
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [ogImageUrl,  setOgImageUrl]  = useState("");
  const [canonicalUrl,setCanonicalUrl]= useState("");
  const [noIndex,     setNoIndex]     = useState(false);
  const [noFollow,    setNoFollow]    = useState(false);
  const [tags,        setTags]        = useState<string[]>([]);
  const [variants,    setVariants]    = useState<Variant[]>([{ ...EMPTY_VARIANT }]);
  const [images,      setImages]      = useState<ProductImage[]>([]);

  // Auto-slug from name
  function handleNameChange(val: string) {
    setName(val);
    if (mode === "new") {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }
  }

  // Load existing product for edit
  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    fetch(`/api/admin/products/${productId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { showError("Product not found"); router.push("/admin/products"); return; }
        const p = d.data;
        setName(p.name); setSlug(p.slug); setCategory(p.category);
        setCategoryId(p.categoryId ?? "");
        setSubCategory(p.subCategory ?? ""); setDescription(p.description ?? "");
        setLongDesc(p.longDesc ?? ""); setSku(p.sku);
        setIsActive(p.isActive); setIsFeatured(p.isFeatured);
        setSortOrder(p.sortOrder); setMetaTitle(p.metaTitle ?? "");
        setMetaDesc(p.metaDesc ?? "");
        setSeoKeywords(p.seoKeywords ?? []);
        setOgImageUrl(p.ogImageUrl ?? "");
        setCanonicalUrl(p.canonicalUrl ?? "");
        setNoIndex(p.noIndex ?? false);
        setNoFollow(p.noFollow ?? false);
        setTags(p.tags ?? []);
        setVariants(p.variants.length > 0 ? p.variants.map((v: Variant) => ({
          id: v.id, name: v.name, priceInr: v.priceInr / 100, mrpInr: (v.mrpInr ?? 0) / 100,
          weight: v.weight ?? "", stock: v.stock, sku: v.sku, isActive: v.isActive,
        })) : [{ ...EMPTY_VARIANT }]);
        setImages(p.images);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, productId]);

  function addVariant() { setVariants((v) => [...v, { ...EMPTY_VARIANT }]); }
  function removeVariant(i: number) { setVariants((v) => v.filter((_, idx) => idx !== i)); }
  function updateVariant(i: number, field: keyof Variant, val: string | number | boolean) {
    setVariants((v) => v.map((vv, idx) => idx === i ? { ...vv, [field]: val } : vv));
  }

  function handleImagesUploaded(files: UploadedFile[]) {
    setImages((prev) => [...prev, ...files.map((f, i) => ({
      url: f.url,
      alt: name || f.filename,
      isPrimary: prev.length === 0 && i === 0,
    }))]);
  }
  function removeImage(i: number) { setImages((imgs) => imgs.filter((_, idx) => idx !== i)); }
  function setPrimary(i: number)  { setImages((imgs) => imgs.map((img, idx) => ({ ...img, isPrimary: idx === i }))); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !slug || !sku) { showError("Name, slug and SKU are required"); return; }
    if (variants.some((v) => !v.name || !v.sku || v.priceInr <= 0)) {
      showError("Each variant needs a name, SKU, and price > 0");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name, slug, category, categoryId: categoryId || null, subCategory: subCategory || null,
        description: description || null, longDesc: longDesc || null, sku,
        isActive, isFeatured, sortOrder: Number(sortOrder),
        metaTitle: metaTitle || null, metaDesc: metaDesc || null,
        seoKeywords, ogImageUrl: ogImageUrl || null, canonicalUrl: canonicalUrl || null,
        noIndex, noFollow, tags,
        variants: variants.map((v) => ({
          ...v,
          priceInr: Math.round(Number(v.priceInr) * 100),
          mrpInr:   Number(v.mrpInr) > 0 ? Math.round(Number(v.mrpInr) * 100) : null,
        })),
        images,
      };

      const url    = mode === "new" ? "/api/admin/products" : `/api/admin/products/${productId}`;
      const method = mode === "new" ? "POST" : "PUT";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data   = await res.json();

      if (data.success) {
        success(mode === "new" ? "Product created!" : "Product updated!");
        router.push("/admin/products");
      } else {
        showError(data.error ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.content}><Spinner size="lg" /></div>;

  const seoValue: SeoPanelValue = {
    metaTitle,
    metaDescription: metaDesc,
    keywords: seoKeywords,
    canonicalUrl,
    ogImageUrl,
    noIndex,
    noFollow,
  };

  return (
    <form onSubmit={handleSubmit} className={styles.content}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="admin-page-title">{mode === "new" ? "Add Product" : "Edit Product"}</h1>
          <p className="admin-page-subtitle">Fill in product details, variants and images</p>
        </div>
        <div className={styles.headerActions}>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/products")}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : mode === "new" ? "Create Product" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left column */}
        <div className={styles.mainCol}>

          {/* Basic info */}
          <Card padding="none" className={styles.section}>
            <CardHeader><h2 className={styles.sectionTitle}>Basic Information</h2></CardHeader>
            <CardBody className={styles.cardFields}>
              <Input label="Product Name *" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Tulsi Honey" required />
              <Input label="URL Slug *" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="tulsi-honey" required />
              <div className={styles.row}>
                <div className={styles.col}>
                  <label className={styles.label}>Category *</label>
                  <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="honey">Honey</option>
                    <option value="ghee">A2 Ghee</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Input label="Sub-category" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="tulsi / karanj / moringa / a2-bilona" />
              </div>
              <NestedCategoryPicker
                endpoint="/api/admin/products/categories"
                value={categoryId}
                onChange={setCategoryId}
                label="Nested Product Category"
                emptyLabel="Use legacy category only"
                defaultColor="#2D7D46"
              />
              <Input label="SKU *" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="HNY-TLS-001" required />
              <TagSelector moduleKey="product" value={tags} onChange={setTags} label="Product Tags" placeholder="Search or create colorful product tags" />
              <Textarea label="Short Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief product description (shown on cards)" rows={3} />
              <Textarea label="Full Description (HTML)" value={longDesc} onChange={(e) => setLongDesc(e.target.value)} placeholder="<p>Rich text / HTML allowed…</p>" rows={8} />
            </CardBody>
          </Card>

          {/* Variants */}
          <Card padding="none" className={styles.section}>
            <CardHeader>
              <div className={styles.sectionHeaderRow}>
                <h2 className={styles.sectionTitle}>Variants</h2>
                <Button type="button" variant="secondary" size="sm" onClick={addVariant}>+ Add Variant</Button>
              </div>
            </CardHeader>
            <CardBody>
              {variants.map((v, i) => (
                <div key={i} className={styles.variantBlock}>
                  <div className={styles.variantHeader}>
                    <span className={styles.variantNum}>Variant {i + 1}</span>
                    {variants.length > 1 && (
                      <button type="button" onClick={() => removeVariant(i)} className={styles.removeVariantBtn}>Remove</button>
                    )}
                  </div>
                  <div className={styles.variantFields}>
                    <Input label="Name *" value={v.name} onChange={(e) => updateVariant(i, "name", e.target.value)} placeholder="500g" />
                    <Input label="SKU *" value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} placeholder="HNY-TLS-500G" />
                    <Input label="Price (₹) *" type="number" min="0" step="0.01" value={v.priceInr || ""} onChange={(e) => updateVariant(i, "priceInr", e.target.value)} placeholder="299" />
                    <Input label="MRP (₹)" type="number" min="0" step="0.01" value={v.mrpInr || ""} onChange={(e) => updateVariant(i, "mrpInr", e.target.value)} placeholder="350" />
                    <Input label="Weight" value={v.weight} onChange={(e) => updateVariant(i, "weight", e.target.value)} placeholder="500g" />
                    <Input label="Stock" type="number" min="0" value={v.stock || ""} onChange={(e) => updateVariant(i, "stock", parseInt(e.target.value) || 0)} placeholder="100" />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Images */}
          <Card padding="none" className={styles.section}>
            <CardHeader><h2 className={styles.sectionTitle}>Product Images</h2></CardHeader>
            <CardBody>
              <MediaUploader
                accept={["image/jpeg", "image/png", "image/webp"]}
                maxSizeMb={5}
                aspectRatio={4 / 3}
                recommendedDimensions={{ width: 1200, height: 900, label: "Recommended: 1200×900px" }}
                onUpload={handleImagesUploaded}
                folder="products"
                multiple
              />
              {images.length > 0 && (
                <div className={styles.imageGrid}>
                  {images.map((img, i) => (
                    <div key={i} className={[styles.imageItem, img.isPrimary ? styles.primaryImage : ""].join(" ")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt} className={styles.imageThumb} />
                      <div className={styles.imageActions}>
                        <button type="button" onClick={() => setPrimary(i)} className={styles.setPrimaryBtn}>
                          {img.isPrimary ? "★ Primary" : "Set Primary"}
                        </button>
                        <button type="button" onClick={() => removeImage(i)} className={styles.removeImageBtn}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right column */}
        <div className={styles.sideCol}>

          {/* Status */}
          <Card padding="md" className={styles.section}>
            <h2 className={styles.sectionTitle}>Status</h2>
            <div className={styles.checkRow}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active (visible in shop)
              </label>
            </div>
            <div className={styles.checkRow}>
              <label className={styles.checkLabel}>
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                Featured (shown on landing page)
              </label>
            </div>
            <Input
              label="Sort Order"
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            />
          </Card>

          {/* SEO */}
          <Card padding="md" className={styles.section}>
            <h2 className={styles.sectionTitle}>SEO</h2>
            <SeoPanel
              value={seoValue}
              titleFallback={name || "Product title for Google"}
              descriptionFallback={description || "Brief product description for search results"}
              tagModule="product"
              onChange={(next) => {
                setMetaTitle(next.metaTitle);
                setMetaDesc(next.metaDescription);
                setSeoKeywords(next.keywords);
                setCanonicalUrl(next.canonicalUrl);
                setOgImageUrl(next.ogImageUrl);
                setNoIndex(next.noIndex);
                setNoFollow(next.noFollow);
              }}
            />
          </Card>

        </div>
      </div>
    </form>
  );
}
