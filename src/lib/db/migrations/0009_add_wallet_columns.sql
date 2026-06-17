ALTER TABLE "orders" ADD COLUMN "bw_wallet_amount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bw_wallet_transaction_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bw_user_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "secondary_gateway" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "secondary_gateway_ref" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bw_user_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bw_linked_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_bw_user_id_unique" UNIQUE("bw_user_id");