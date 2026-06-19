"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import styles from "./categories.module.css";

interface Cat {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  color: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface CategoriesClientProps {
  parents:  Cat[];
  children: Cat[];
}

// Comprehensive icon map
const CATEGORY_ICONS: Record<string, string> = {
  "food":          "🥘", "grocery":       "🛒", "honey":         "🍯",
  "ghee":          "🧈", "butter":        "🧈", "spice":         "🌶️",
  "masala":        "🌶️", "oil":           "🫙", "snack":         "🍿",
  "namkeen":       "🍿", "beverage":      "🍵", "tea":           "🍵",
  "coffee":        "☕",  "juice":         "🧃", "grain":         "🌾",
  "rice":          "🍚", "millet":        "🌾", "cereal":        "🥣",
  "flour":         "🌾", "pulse":         "🫘", "lentil":        "🫘",
  "jaggery":       "🍬", "sugar":         "🍬", "salt":          "🧂",
  "dairy":         "🥛", "egg":           "🥚", "pickle":        "🫙",
  "jam":           "🍓", "sauce":         "🫙", "condiment":     "🫙",
  "bakery":        "🥖", "bread":         "🍞", "dry fruit":     "🥜",
  "nut":           "🥜", "protein":       "💪",
  "ayurveda":      "🌿", "herbal":        "🌿", "medicine":      "💊",
  "tonic":         "🍶", "immunity":      "🛡️", "digestive":     "🫁",
  "liver":         "💊", "diabetic":      "💊", "pain":          "🩹",
  "joint":         "🦴", "supplement":    "💊", "essential oil": "🌸",
  "extract":       "🌸", "kadha":         "🍵", "stress":        "🧘",
  "sleep":         "😴", "weight":        "⚖️",
  "personal care": "✨", "beauty":        "✨", "hair oil":      "💆",
  "serum":         "💆", "shampoo":       "🧴", "conditioner":   "🧴",
  "hair color":    "🎨", "hair":          "💆", "face wash":     "🧼",
  "moisturis":     "🧴", "skin":          "✨", "cosmetic":      "💄",
  "lipstick":      "💄", "perfume":       "🌹", "deodorant":     "🌹",
  "soap":          "🧼", "cream":         "🧴",
  "home":          "🏠", "living":        "🛋️", "kitchen":       "🍳",
  "cookware":      "🍳", "bedding":       "🛏️", "furniture":     "🪑",
  "lighting":      "💡", "cleaning":      "🧹", "storage":       "📦",
  "decor":         "🖼️",
  "baby":          "🍼", "kid":           "🧒", "toddler":       "🧒",
  "infant":        "👶", "diaper":        "🍼", "toy":           "🧸",
  "stroller":      "🛒",
  "electronic":    "📱", "phone":         "📱", "mobile":        "📱",
  "laptop":        "💻", "computer":      "💻", "tablet":        "📟",
  "gadget":        "🔌", "camera":        "📷", "tv":            "📺",
  "audio":         "🎵", "headphone":     "🎧", "earphone":      "🎧",
  "charger":       "🔌", "accessory":     "🔌",
  "fashion":       "👗", "clothing":      "👕", "ethnic":        "👘",
  "saree":         "👘", "kurta":         "👘", "shirt":         "👔",
  "trouser":       "👖", "dress":         "👗", "jeans":         "👖",
  "footwear":      "👟", "shoe":          "👟", "sandal":        "🩴",
  "bag":           "👜", "wallet":        "👛", "watch":         "⌚",
  "sunglass":      "🕶️",
  "book":          "📚", "stationery":    "✏️", "pen":           "🖊️",
  "notebook":      "📓", "art":           "🎨", "craft":         "✂️",
  "sport":         "⚽", "fitness":       "💪", "gym":           "🏋️",
  "yoga":          "🧘", "cycling":       "🚴", "cricket":       "🏏",
  "badminton":     "🏸", "outdoor":       "🏕️", "trekking":      "🏔️",
  "agriculture":   "🌱", "garden":        "🌻", "plant":         "🪴",
  "seed":          "🌱", "fertilizer":    "🌿", "farming":       "🌾",
  "jewellery":     "💍", "jewelry":       "💍", "ring":          "💍",
  "necklace":      "📿", "bracelet":      "📿", "earring":       "👂",
  "silver":        "🥈", "gold":          "🥇",
  "pet":           "🐾", "dog":           "🐶", "cat":           "🐱",
  "bird":          "🐦", "aquarium":      "🐠",
  "office":        "🗂️", "printer":       "🖨️", "file":          "📁",
  "organiser":     "📂",
};

function getCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  const keys = Object.keys(CATEGORY_ICONS).sort((a, b) => b.length - a.length);
  for (const k of keys) { if (n.includes(k)) return CATEGORY_ICONS[k]; }
  return "🛍️";
}

export default function CategoriesClient({ parents, children }: CategoriesClientProps) {
  const [search, setSearch] = useState("");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  const filteredParents = useMemo(() => {
    if (!search.trim()) return parents;
    const q = search.toLowerCase();
    return parents.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      const kids = children.filter((c) => c.parentId === p.id);
      return kids.some((c) => c.name.toLowerCase().includes(q));
    });
  }, [parents, children, search]);

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>BuyWell Marketplace</p>
          <h1 className={styles.heroTitle}>All Categories</h1>
          <p className={styles.heroSub}>
            {parents.length} top-level categories · {children.length} subcategories · All GST-compliant
          </p>
          <div className={styles.heroSearch}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch("")} type="button">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* Category grid */}
      <div className={styles.container}>
        {filteredParents.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔍</span>
            <p>No categories match &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch("")} className={styles.emptyBtn}>Clear search</button>
          </div>
        ) : (
          <div className={styles.categoriesGrid}>
            {filteredParents.map((parent) => {
              const kids = children
                .filter((c) => c.parentId === parent.id)
                .filter((c) => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || parent.name.toLowerCase().includes(search.toLowerCase()));
              const isExpanded = expandedParent === parent.id;
              const KIDS_PREVIEW = 6;

              return (
                <div
                  key={parent.id}
                  className={styles.parentCard}
                  style={{ "--cat-color": parent.color ?? "#0d7659" } as React.CSSProperties}
                >
                  {/* Parent header */}
                  <Link href={`/shop?category=${parent.slug}`} className={styles.parentHeader}>
                    <span className={styles.parentIcon}>{getCategoryIcon(parent.name)}</span>
                    <div className={styles.parentInfo}>
                      <span className={styles.parentName}>{parent.name}</span>
                      {parent.description && (
                        <span className={styles.parentDesc}>{parent.description}</span>
                      )}
                    </div>
                    <span className={styles.parentArrow}>›</span>
                  </Link>

                  {/* Subcategories */}
                  {kids.length > 0 && (
                    <div className={styles.subGrid}>
                      {(isExpanded ? kids : kids.slice(0, KIDS_PREVIEW)).map((child) => (
                        <Link
                          key={child.id}
                          href={`/shop?category=${child.slug}`}
                          className={styles.subChip}
                        >
                          <span className={styles.subIcon}>{getCategoryIcon(child.name)}</span>
                          <span className={styles.subName}>{child.name}</span>
                        </Link>
                      ))}
                      {kids.length > KIDS_PREVIEW && (
                        <button
                          className={styles.subShowMore}
                          onClick={() => setExpandedParent(isExpanded ? null : parent.id)}
                          type="button"
                        >
                          {isExpanded
                            ? "▲ Less"
                            : `+${kids.length - KIDS_PREVIEW} more`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
