ALTER TABLE "orders" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "hsn_code" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "tax_rate_id" integer;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "show_on_homepage" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "show_on_shop" boolean DEFAULT true NOT NULL;