-- Add homepage and shop visibility flags to product categories
-- Admin can toggle which categories appear in homepage grids and shop page filters

ALTER TABLE "product_categories"
  ADD COLUMN IF NOT EXISTS "show_on_homepage" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "show_on_shop"     boolean NOT NULL DEFAULT true;
