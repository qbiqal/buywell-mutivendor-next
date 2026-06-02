import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { cacheInvalidate } from "@/lib/cache";
import { getAvailableMenuTargets, isMenuKey, isSafeMenuHref, MENU_KEYS } from "@/lib/cms";
import { db } from "@/lib/db";
import { cmsMenuItems, cmsMenus } from "@/lib/db/schema";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { createAdminGuard } from "@/lib/middleware";
import { requireModuleApi } from "@/lib/modules";
import { revalidateSiteShell } from "@/lib/revalidation";

const DEFAULT_MENU_LABELS: Record<string, string> = {
  landing_header: "Landing Page Header",
  site_header: "Other Pages Header",
  footer: "Footer Menu",
};

export async function GET(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;

    await ensureMenus();
    const [menus, items, targets] = await Promise.all([
      db.select().from(cmsMenus).orderBy(asc(cmsMenus.menuKey)),
      db.select().from(cmsMenuItems).orderBy(asc(cmsMenuItems.sortOrder), asc(cmsMenuItems.label)),
      getAvailableMenuTargets(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        menus: menus.map((menu) => ({
          ...menu,
          items: items.filter((item) => item.menuId === menu.id),
        })),
        targets,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await createAdminGuard()(req);
    if (authResult) return authResult;
    const moduleResult = await requireModuleApi("cms");
    if (moduleResult) return moduleResult;

    await ensureMenus();
    const body = await req.json() as { menuKey?: string; items?: MenuItemInput[]; isEnabled?: boolean };
    const menuKey = String(body.menuKey ?? "");
    if (!isMenuKey(menuKey)) throw new ValidationError("Unsupported menu key");
    if (!Array.isArray(body.items)) throw new ValidationError("Menu items are required");

    const [menu] = await db.select().from(cmsMenus).where(eq(cmsMenus.menuKey, menuKey)).limit(1);
    if (!menu) throw new NotFoundError("CMS menu");

    const values = body.items.map((item, index) => normalizeItem(menu.id, item, index));
    const validIds = new Set(values.map((item) => item.id));
    for (const value of values) {
      if (value.parentItemId && (!validIds.has(value.parentItemId) || value.parentItemId === value.id)) {
        value.parentItemId = null;
      }
    }
    await db.transaction(async (tx) => {
      await tx.update(cmsMenus).set({
        isEnabled: body.isEnabled !== false,
        updatedAt: new Date(),
      }).where(eq(cmsMenus.id, menu.id));
      await tx.delete(cmsMenuItems).where(eq(cmsMenuItems.menuId, menu.id));
      if (values.length > 0) await tx.insert(cmsMenuItems).values(values);
    });

    await cacheInvalidate.menus();
    revalidateSiteShell();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

interface MenuItemInput {
  id?: string;
  label?: string;
  href?: string;
  itemType?: string;
  targetId?: string;
  parentItemId?: string | null;
  opensNewTab?: boolean;
  isEnabled?: boolean;
}

function normalizeItem(menuId: string, item: MenuItemInput, index: number) {
  const label = String(item.label ?? "").trim();
  const href = String(item.href ?? "").trim();
  if (!label) throw new ValidationError("Each menu item needs a label");
  if (!isSafeMenuHref(href)) throw new ValidationError(`Invalid menu href: ${href}`);

  const itemType = String(item.itemType || "external");
  return {
    id: safeItemId(item.id),
    menuId,
    label,
    href,
    itemType,
    pageId: itemType === "cms_page" ? item.targetId ?? null : null,
    blogPostId: itemType === "blog_post" ? item.targetId ?? null : null,
    productId: itemType === "product" ? item.targetId ?? null : null,
    parentItemId: item.parentItemId ? String(item.parentItemId) : null,
    opensNewTab: item.opensNewTab === true,
    isEnabled: item.isEnabled !== false,
    sortOrder: index,
  };
}

function safeItemId(value: unknown): string {
  const id = String(value ?? "").trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(id) ? id : crypto.randomUUID();
}

async function ensureMenus() {
  for (const key of MENU_KEYS) {
    await db.insert(cmsMenus).values({
      menuKey: key,
      label: DEFAULT_MENU_LABELS[key],
    }).onConflictDoNothing();
  }
}
