import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { getAllSiteConfig } from "./config";

export type ModuleKey = "core" | "cms" | "seo" | "blog" | "ecommerce";
export type PaymentModuleKey = "offline_qr";

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
}

export interface AppModule {
  key: ModuleKey;
  name: string;
  canDisable: boolean;
  defaultEnabled: boolean;
  adminNav: NavItem[];
  publicNav: NavItem[];
  dependencies?: ModuleKey[];
}

export const APP_MODULES: AppModule[] = [
  {
    key: "core",
    name: "Core",
    canDisable: false,
    defaultEnabled: true,
    adminNav: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "📊" },
      { label: "Media", href: "/admin/media", icon: "🖼️" },
      { label: "WhatsApp", href: "/admin/whatsapp", icon: "💬" },
      { label: "Settings", href: "/admin/settings", icon: "⚙️" },
      { label: "Change Password", href: "/admin/settings/password", icon: "🔑" },
    ],
    publicNav: [],
  },
  {
    key: "cms",
    name: "CMS",
    canDisable: true,
    defaultEnabled: true,
    adminNav: [
      { label: "CMS", href: "/admin/cms", icon: "🎨" },
      { label: "CMS Pages", href: "/admin/cms/pages", icon: "📄" },
      { label: "Menus", href: "/admin/cms/menus", icon: "🧭" },
    ],
    publicNav: [{ label: "About", href: "/#promise" }],
  },
  {
    key: "seo",
    name: "SEO",
    canDisable: true,
    defaultEnabled: true,
    adminNav: [{ label: "SEO", href: "/admin/seo", icon: "🔎" }],
    publicNav: [],
    dependencies: ["cms"],
  },
  {
    key: "blog",
    name: "Blog",
    canDisable: true,
    defaultEnabled: true,
    adminNav: [{ label: "Blog", href: "/admin/blog", icon: "📝" }],
    publicNav: [{ label: "Blog", href: "/blog" }],
  },
  {
    key: "ecommerce",
    name: "E-Commerce",
    canDisable: true,
    defaultEnabled: true,
    adminNav: [
      { label: "Orders", href: "/admin/orders", icon: "📦", badge: "orders" },
      { label: "Products", href: "/admin/products", icon: "🛍️" },
      { label: "Customers", href: "/admin/customers", icon: "👥" },
      { label: "Analytics", href: "/admin/analytics", icon: "📈" },
    ],
    publicNav: [{ label: "Shop", href: "/shop" }],
  },
];

export const PAYMENT_MODULES = [
  {
    key: "offline_qr" as const,
    name: "Offline QR",
    configKey: "payment_offline_qr_enabled",
    defaultEnabled: true,
    dependencies: ["ecommerce"] as ModuleKey[],
  },
];

export type ModuleState = Record<ModuleKey, boolean>;
export type PaymentModuleState = Record<PaymentModuleKey, boolean>;

function boolConfig(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value !== "false";
}

export async function getModuleState(): Promise<ModuleState> {
  const config = await getAllSiteConfig("modules");
  const state = APP_MODULES.reduce((current, mod) => {
    current[mod.key] = mod.key === "core"
      ? true
      : boolConfig(config[`module_${mod.key}_enabled`], mod.defaultEnabled);
    return current;
  }, {} as ModuleState);
  for (const mod of APP_MODULES) {
    if (mod.dependencies?.some((key) => !state[key])) state[mod.key] = false;
  }
  return state;
}

export async function getPaymentModuleState(): Promise<PaymentModuleState> {
  const [modules, payment] = await Promise.all([
    getModuleState(),
    getAllSiteConfig("payment"),
  ]);

  return PAYMENT_MODULES.reduce((state, mod) => {
    const dependenciesEnabled = mod.dependencies.every((key) => modules[key]);
    state[mod.key] = dependenciesEnabled && boolConfig(payment[mod.configKey], mod.defaultEnabled);
    return state;
  }, {} as PaymentModuleState);
}

export async function isModuleEnabled(key: ModuleKey): Promise<boolean> {
  const state = await getModuleState();
  return state[key] === true;
}

export async function requireModulePage(key: ModuleKey): Promise<void> {
  if (!(await isModuleEnabled(key))) notFound();
}

export async function requireModuleApi(key: ModuleKey): Promise<NextResponse | null> {
  if (await isModuleEnabled(key)) return null;
  const mod = APP_MODULES.find((m) => m.key === key);
  return NextResponse.json(
    {
      success: false,
      error: `${mod?.name ?? key} module is disabled`,
      code: "MODULE_DISABLED",
    },
    { status: 404 },
  );
}

export function getEnabledAdminNav(state: ModuleState): NavItem[] {
  return APP_MODULES
    .filter((mod) => state[mod.key])
    .flatMap((mod) => mod.adminNav);
}

export function getEnabledPublicNav(state: ModuleState): NavItem[] {
  const order: ModuleKey[] = ["ecommerce", "blog", "cms"];
  return order
    .filter((key) => state[key])
    .flatMap((key) => APP_MODULES.find((mod) => mod.key === key)?.publicNav ?? []);
}

export async function getLocalizationConfig() {
  const config = await getAllSiteConfig("localization");
  return {
    defaultLocale: config.locale_default ?? "en",
    enabledLocales: (config.locales_enabled ?? "en")
      .split(",")
      .map((locale) => locale.trim())
      .filter(Boolean),
  };
}

export async function getCurrencyConfig() {
  const config = await getAllSiteConfig("localization");
  const defaultCurrency = config.currency_default ?? "INR";
  const enabledCurrencies = (config.currencies_enabled ?? defaultCurrency)
    .split(",")
    .map((currency) => currency.trim().toUpperCase())
    .filter(Boolean);

  let rates: Record<string, number> = { INR: 1 };
  try {
    rates = JSON.parse(config.currency_rates_json ?? "{\"INR\":1}") as Record<string, number>;
  } catch {}

  return {
    defaultCurrency,
    enabledCurrencies,
    rates,
  };
}
