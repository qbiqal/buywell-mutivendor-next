CREATE TABLE "homepage_banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"subtitle" text,
	"image_url" text NOT NULL,
	"mobile_image_url" text,
	"link_url" text,
	"link_text" text,
	"banner_type" text DEFAULT 'hero' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
