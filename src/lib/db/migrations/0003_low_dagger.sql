CREATE TABLE "cms_menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_id" text NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"item_type" text DEFAULT 'external' NOT NULL,
	"page_id" text,
	"blog_post_id" text,
	"product_id" text,
	"opens_new_tab" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_menus" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_key" text NOT NULL,
	"label" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_menus_menu_key_unique" UNIQUE("menu_key")
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"template" text DEFAULT 'standard' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"keywords" text[],
	"canonical_url" text,
	"og_image_url" text,
	"no_index" boolean DEFAULT false NOT NULL,
	"no_follow" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "seo_internal_links" (
	"id" text PRIMARY KEY NOT NULL,
	"source_path" text NOT NULL,
	"target_path" text NOT NULL,
	"anchor_text" text NOT NULL,
	"context" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_page_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"route_path" text NOT NULL,
	"title" text,
	"description" text,
	"keywords" text[],
	"canonical_url" text,
	"og_image_url" text,
	"robots" text DEFAULT 'index,follow' NOT NULL,
	"structured_data" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seo_page_overrides_route_path_unique" UNIQUE("route_path")
);
--> statement-breakpoint
CREATE TABLE "seo_search_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"engine" text NOT NULL,
	"endpoint" text,
	"sitemap_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"response" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text DEFAULT 'page_view' NOT NULL,
	"path" text NOT NULL,
	"referrer" text,
	"source" text,
	"medium" text,
	"campaign" text,
	"visitor_id" text,
	"session_id" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_menu_items" ADD CONSTRAINT "cms_menu_items_menu_id_cms_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."cms_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_menu_items" ADD CONSTRAINT "cms_menu_items_page_id_cms_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."cms_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_menu_items" ADD CONSTRAINT "cms_menu_items_blog_post_id_blog_posts_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_menu_items" ADD CONSTRAINT "cms_menu_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cms_pages_slug" ON "cms_pages" ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cms_pages_status" ON "cms_pages" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cms_pages_updated_at" ON "cms_pages" ("updated_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cms_menus_menu_key" ON "cms_menus" ("menu_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cms_menu_items_menu_id" ON "cms_menu_items" ("menu_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cms_menu_items_sort_order" ON "cms_menu_items" ("sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seo_page_overrides_route_path" ON "seo_page_overrides" ("route_path");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seo_internal_links_source_path" ON "seo_internal_links" ("source_path");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_traffic_events_created_at" ON "traffic_events" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_traffic_events_path" ON "traffic_events" ("path");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_traffic_events_visitor_id" ON "traffic_events" ("visitor_id");
