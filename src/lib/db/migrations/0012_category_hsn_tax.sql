-- Add HSN code and default tax rate to product categories
-- Enables auto-population of GST fields when a category is selected in the product form

ALTER TABLE "product_categories"
  ADD COLUMN IF NOT EXISTS "hsn_code"   text,
  ADD COLUMN IF NOT EXISTS "tax_rate_id" integer REFERENCES "tax_rates"("id");
