CREATE TABLE "order_vendor_splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"vendor_id" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"shipping" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_item_id" text NOT NULL,
	"vendor_id" integer NOT NULL,
	"order_id" text NOT NULL,
	"gross_amount" integer NOT NULL,
	"commission_rate" integer NOT NULL,
	"commission_amount" integer NOT NULL,
	"vendor_payout" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payout_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_payout_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_id" integer NOT NULL,
	"commission_id" integer NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"payment_reference" text,
	"notes" text,
	"initiated_by" text,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"store_name" text NOT NULL,
	"store_slug" text NOT NULL,
	"store_description" text,
	"logo_url" text,
	"banner_url" text,
	"phone" text,
	"email" text,
	"address" text,
	"city" text,
	"state" text,
	"pincode" text,
	"gstin" text,
	"pan" text,
	"bank_account" text,
	"bank_ifsc" text,
	"bank_name" text,
	"account_holder" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"commission_override" integer,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"rating" text DEFAULT '0.00' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"rejected_at" timestamp with time zone,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_store_slug_unique" UNIQUE("store_slug")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "order_vendor_splits" ADD CONSTRAINT "order_vendor_splits_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_vendor_splits" ADD CONSTRAINT "order_vendor_splits_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commissions" ADD CONSTRAINT "vendor_commissions_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commissions" ADD CONSTRAINT "vendor_commissions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commissions" ADD CONSTRAINT "vendor_commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_commissions" ADD CONSTRAINT "vendor_commissions_payout_id_vendor_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."vendor_payouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payout_items" ADD CONSTRAINT "vendor_payout_items_payout_id_vendor_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."vendor_payouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payout_items" ADD CONSTRAINT "vendor_payout_items_commission_id_vendor_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."vendor_commissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_payouts" ADD CONSTRAINT "vendor_payouts_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;