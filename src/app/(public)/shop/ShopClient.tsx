"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { Spinner } from "@/components/ui/Spinner";
import type { ProductWithVariants } from "@/types";
import styles from "./shop.module.css";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  color: string | null;
}

interface ProductMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const SORT_OPTIONS = [
  { value: "default",    label: "Relevance" },
  { value: "newest",     label: "Newest First" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const PRICE_MAX_DEFAULT = 10000;

export default function ShopClient() {
  const [products,    setProducts]    = useState<ProductWithVariants[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [meta,        setMeta]        = useState<ProductMeta>({ total: 0, page: 1, limit: 24, pages: 1 });
  const [viewMode,    setViewMode]    = useState<"grid" | "list">("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [search,     setSearch]     = useState("");
  const [searchInput,setSearchInput]= useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sort,       setSort]       = useState("default");
  const [minPrice,   setMinPrice]   = useState(0);
  const [maxPrice,   setMaxPrice]   = useState(PRICE_MAX_DEFAULT);
  const [inStock,    setInStock]    = useState(false);
  const [page,       setPage]       = useState(1);

  // Pending slug from URL — resolved to ID once categories load
  const [pendingSlug, setPendingSlug] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("category") ?? "";
  });

  // Price slider refs for dual-handle logic
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  // Read ?search= from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("search") ?? "";
    if (q) { setSearch(q); setSearchInput(q); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch categories once, then resolve pending slug → ID
  useEffect(() => {
    fetch("/api/products/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(() => {});
  }, []);

  // Once categories load, resolve ?category=slug → categoryId
  useEffect(() => {
    if (!pendingSlug || categories.length === 0) return;
    const match = categories.find((c) => c.slug === pendingSlug);
    if (match) { setCategoryId(match.id); setPage(1); }
    setPendingSlug("");
  }, [pendingSlug, categories]);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)     params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    if (sort !== "default") params.set("sort", sort);
    if (minPrice > 0) params.set("minPrice", String(minPrice));
    if (maxPrice < PRICE_MAX_DEFAULT) params.set("maxPrice", String(maxPrice));
    if (inStock)    params.set("inStock", "true");
    params.set("page",  String(page));
    params.set("limit", "24");

    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.data);
          if (d.meta) setMeta(d.meta);
        }
      })
      .finally(() => setLoading(false));
  }, [search, categoryId, sort, minPrice, maxPrice, inStock, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  function handleCategoryClick(id: string) {
    setCategoryId(prev => prev === id ? "" : id);
    setPage(1);
    setSidebarOpen(false);
  }

  function resetFilters() {
    setSearch(""); setSearchInput(""); setCategoryId("");
    setSort("default"); setMinPrice(0); setMaxPrice(PRICE_MAX_DEFAULT);
    setInStock(false); setPage(1);
  }

  const topLevel  = categories.filter((c) => !c.parentId);
  const hasFilter = !!(search || categoryId || sort !== "default" || minPrice > 0 || maxPrice < PRICE_MAX_DEFAULT || inStock);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className={styles.page}>
      {/* Page hero */}
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>BuyWell Online Shopping</p>
          <h1 className={styles.heroTitle}>Discover Great Products</h1>
          <p className={styles.heroSub}>Fashion · Electronics · Health · Home & Kitchen · and more</p>
          {/* Hero search bar */}
          <div className={styles.heroSearch}>
            <svg className={styles.heroSearchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              className={styles.heroSearchInput}
              type="text"
              placeholder="Search products…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className={styles.heroSearchClear} onClick={() => { setSearchInput(""); setSearch(""); }}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* ── Sidebar ── */}
          <aside className={[styles.sidebar, sidebarOpen ? styles.sidebarOpen : ""].join(" ")}>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarTitle}>Filters</span>
              {hasFilter && (
                <button className={styles.clearBtn} onClick={resetFilters}>Clear all</button>
              )}
              <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>✕</button>
            </div>

            {/* Category tree */}
            {topLevel.length > 0 && (
              <div className={styles.filterSection}>
                <h3 className={styles.filterLabel}>Categories</h3>
                <ul className={styles.catList}>
                  <li>
                    <button
                      className={[styles.catItem, !categoryId ? styles.catActive : ""].join(" ")}
                      onClick={() => { setCategoryId(""); setPage(1); setSidebarOpen(false); }}
                    >
                      <span className={styles.catDot} style={{ background: "#0d7659" }} />
                      All Products
                    </button>
                  </li>
                  {topLevel.map((cat) => {
                    const children = categories.filter((c) => c.parentId === cat.id);
                    return (
                      <li key={cat.id}>
                        <button
                          className={[styles.catItem, categoryId === cat.id ? styles.catActive : ""].join(" ")}
                          onClick={() => handleCategoryClick(cat.id)}
                        >
                          <span className={styles.catDot} style={{ background: cat.color ?? "#0d7659" }} />
                          {cat.name}
                        </button>
                        {children.length > 0 && (
                          <ul className={styles.subCatList}>
                            {children.map((sub) => (
                              <li key={sub.id}>
                                <button
                                  className={[styles.catItem, styles.subCatItem, categoryId === sub.id ? styles.catActive : ""].join(" ")}
                                  onClick={() => handleCategoryClick(sub.id)}
                                >
                                  {sub.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Price range */}
            <div className={styles.filterSection}>
              <h3 className={styles.filterLabel}>Price Range</h3>
              <div className={styles.priceRange}>
                <div className={styles.priceLabels}>
                  <span>₹{minPrice.toLocaleString("en-IN")}</span>
                  <span>₹{maxPrice.toLocaleString("en-IN")}{maxPrice >= PRICE_MAX_DEFAULT ? "+" : ""}</span>
                </div>
                <div className={styles.sliderWrap}>
                  <input
                    ref={minRef}
                    type="range" min="0" max={PRICE_MAX_DEFAULT} step="100"
                    value={minPrice}
                    className={styles.rangeInput}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (v < maxPrice) { setMinPrice(v); setPage(1); }
                    }}
                  />
                  <input
                    ref={maxRef}
                    type="range" min="0" max={PRICE_MAX_DEFAULT} step="100"
                    value={maxPrice}
                    className={[styles.rangeInput, styles.rangeInputTop].join(" ")}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (v > minPrice) { setMaxPrice(v); setPage(1); }
                    }}
                  />
                  {/* Track fill */}
                  <div className={styles.trackFill} style={{
                    left:  `${(minPrice / PRICE_MAX_DEFAULT) * 100}%`,
                    right: `${100 - (maxPrice / PRICE_MAX_DEFAULT) * 100}%`,
                  }} />
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className={styles.filterSection}>
              <h3 className={styles.filterLabel}>Availability</h3>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => { setInStock(e.target.checked); setPage(1); }}
                  className={styles.checkbox}
                />
                In Stock Only
              </label>
            </div>
          </aside>

          {/* Sidebar overlay */}
          {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

          {/* ── Product area ── */}
          <div className={styles.productArea}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                <button className={styles.filterToggle} onClick={() => setSidebarOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
                  Filters
                </button>
                <span className={styles.resultCount}>
                  {loading ? "Loading…" : `${meta.total.toLocaleString("en-IN")} product${meta.total !== 1 ? "s" : ""}`}
                  {selectedCategory && <span className={styles.activeFilter}> in {selectedCategory.name}</span>}
                </span>
              </div>
              <div className={styles.toolbarRight}>
                <select
                  className={styles.sortSelect}
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className={styles.viewToggle}>
                  <button
                    className={[styles.viewBtn, viewMode === "grid" ? styles.viewBtnActive : ""].join(" ")}
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                  </button>
                  <button
                    className={[styles.viewBtn, viewMode === "list" ? styles.viewBtnActive : ""].join(" ")}
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="3" y="4" width="18" height="3" rx="1"/><rect x="3" y="10.5" width="18" height="3" rx="1"/><rect x="3" y="17" width="18" height="3" rx="1"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {hasFilter && (
              <div className={styles.filterChips}>
                {search && (
                  <span className={styles.chip}>
                    Search: "{search}"
                    <button onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>✕</button>
                  </span>
                )}
                {selectedCategory && (
                  <span className={styles.chip}>
                    {selectedCategory.name}
                    <button onClick={() => { setCategoryId(""); setPage(1); }}>✕</button>
                  </span>
                )}
                {(minPrice > 0 || maxPrice < PRICE_MAX_DEFAULT) && (
                  <span className={styles.chip}>
                    ₹{minPrice}–{maxPrice < PRICE_MAX_DEFAULT ? `₹${maxPrice}` : `₹${PRICE_MAX_DEFAULT}+`}
                    <button onClick={() => { setMinPrice(0); setMaxPrice(PRICE_MAX_DEFAULT); setPage(1); }}>✕</button>
                  </span>
                )}
                {inStock && (
                  <span className={styles.chip}>
                    In Stock
                    <button onClick={() => { setInStock(false); setPage(1); }}>✕</button>
                  </span>
                )}
                <button className={styles.clearChip} onClick={resetFilters}>Clear all</button>
              </div>
            )}

            {/* Products */}
            {loading ? (
              <div className={styles.loadingWrap}><Spinner size="lg" /></div>
            ) : products.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🛍️</div>
                <h3 className={styles.emptyTitle}>No products found</h3>
                <p className={styles.emptyText}>Try adjusting your filters or search terms.</p>
                <button className={styles.emptyReset} onClick={resetFilters}>Clear filters</button>
              </div>
            ) : (
              <div className={viewMode === "grid" ? styles.grid : styles.list}>
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} listMode={viewMode === "list"} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta.pages > 1 && !loading && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                >
                  ← Prev
                </button>
                {Array.from({ length: meta.pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === meta.pages || Math.abs(p - page) <= 2)
                  .reduce<(number | "…")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…"
                      ? <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
                      : <button
                          key={p}
                          className={[styles.pageBtn, page === p ? styles.pageBtnActive : ""].join(" ")}
                          onClick={() => { setPage(p as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        >{p}</button>
                  )
                }
                <button
                  className={styles.pageBtn}
                  disabled={page >= meta.pages}
                  onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
