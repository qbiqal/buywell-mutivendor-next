ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "hsn_code" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "tax_rate_id" integer;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "show_on_homepage" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "show_on_shop" boolean DEFAULT true NOT NULL;