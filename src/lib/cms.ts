import { and, asc, desc, eq } from "drizzle-orm";
import { CACHE_TTL, withCache } from "./cache";
import { db } from "./db";
import { blogPosts, cmsMenuItems, cmsMenus, cmsPages, products } from "./db/schema";

export const MENU_KEYS = ["landing_header", "site_header", "footer"] as const;
export type MenuKey = typeof MENU_KEYS[number];

export interface PublicMenuItem {
  id: string;
  label: string;
  href: string;
  itemType: string;
  opensNewTab: boolean;
}

export type PublicMenus = Record<MenuKey, PublicMenuItem[]>;

export interface AvailableMenuTarget {
  id: string;
  type: string;
  label: string;
  href: string;
  meta?: string;
}

export async function getPublicMenus(): Promise<PublicMenus> {
  return withCache("query:cms:menus:public", CACHE_TTL.CONFIG, async () => {
    const [menus, items] = await Promise.all([
      db.select().from(cmsMenus).where(eq(cmsMenus.isEnabled, true)),
      db.select().from(cmsMenuItems)
        .where(eq(cmsMenuItems.isEnabled, true))
        .orderBy(asc(cmsMenuItems.sortOrder), asc(cmsMenuItems.label)),
    ]);

    const menuById = new Map(menus.map((menu) => [menu.id, menu]));
    const result = emptyMenus();
    for (const item of items) {
      const menu = menuById.get(item.menuId);
      if (!menu || !isMenuKey(menu.menuKey)) continue;
      result[menu.menuKey].push({
        id: item.id,
        label: item.label,
        href: item.href,
        itemType: item.itemType,
        opensNewTab: item.opensNewTab,
      });
    }
    return result;
  });
}

export async function getCmsPageBySlug(slug: string) {
  return withCache(`query:cms:pages:slug:${slug}`, CACHE_TTL.CONFIG, async () => {
    const [page] = await db.select()
      .from(cmsPages)
      .where(and(eq(cmsPages.slug, slug), eq(cmsPages.status, "published")))
      .limit(1);
    return page ?? null;
  });
}

export async function getPublishedCmsPages() {
  return withCache("query:cms:pages:published", CACHE_TTL.CONFIG, async () =>
    db.select()
      .from(cmsPages)
      .where(eq(cmsPages.status, "published"))
      .orderBy(asc(cmsPages.sortOrder), asc(cmsPages.title))
  );
}

export async function getAvailableMenuTargets(): Promise<AvailableMenuTarget[]> {
  const [pages, posts, productRows] = await Promise.all([
    db.select({
      id: cmsPages.id,
      title: cmsPages.title,
      slug: cmsPages.slug,
      status: cmsPages.status,
    }).from(cmsPages).orderBy(asc(cmsPages.title)),
    db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      status: blogPosts.status,
      publishedAt: blogPosts.publishedAt,
    }).from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt)).limit(100),
    db.select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      category: products.category,
    }).from(products).where(eq(products.isActive, true)).orderBy(asc(products.sortOrder), asc(products.name)).limit(100),
  ]);

  return [
    { id: "home", type: "landing_anchor", label: "Landing Page", href: "/", meta: "Homepage" },
    { id: "promise", type: "landing_anchor", label: "Our Promise", href: "/#promise", meta: "Landing section" },
    { id: "products", type: "landing_anchor", label: "Products Section", href: "/#products", meta: "Landing section" },
    { id: "gallery", type: "landing_anchor", label: "Community", href: "/#gallery", meta: "Landing section" },
    { id: "contact", type: "landing_anchor", label: "Contact", href: "/#contact", meta: "Landing section" },
    { id: "blog-index", type: "blog_index", label: "Blog Listing", href: "/blog", meta: "Blog grid/list page" },
    { id: "shop-index", type: "shop_index", label: "Shop Listing", href: "/shop", meta: "Product grid page" },
    ...pages.map((page) => ({
      id: page.id,
      type: "cms_page",
      label: page.title,
      href: `/${page.slug}`,
      meta: page.status === "published" ? "CMS page" : "Draft CMS page",
    })),
    ...posts.map((post) => ({
      id: post.id,
      type: "blog_post",
      label: post.title,
      href: `/blog/${post.slug}`,
      meta: "Blog post",
    })),
    ...productRows.map((product) => ({
      id: product.id,
      type: "product",
      label: product.name,
      href: `/shop/${product.slug}`,
      meta: `Product · ${product.category}`,
    })),
  ];
}

export function isMenuKey(value: string): value is MenuKey {
  return MENU_KEYS.includes(value as MenuKey);
}

export function emptyMenus(): PublicMenus {
  return {
    landing_header: [],
    site_header: [],
    footer: [],
  };
}

export function isSafeMenuHref(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("/") || value.startsWith("#")) return true;
  return /^(https?:|mailto:|tel:)/i.test(value);
}
