ALTER TABLE "product_categories"
  ADD COLUMN IF NOT EXISTS "show_on_hero_sidebar" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "show_on_shop_widget"  boolean NOT NULL DEFAULT false;
