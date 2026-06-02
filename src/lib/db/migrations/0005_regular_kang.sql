CREATE TABLE "notification_wallet_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_id" text NOT NULL,
	"channel" text NOT NULL,
	"type" text NOT NULL,
	"credits" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" text,
	"reference_type" text,
	"reference_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"balance_credits" integer DEFAULT 0 NOT NULL,
	"low_balance_threshold" integer DEFAULT 10 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_wallets_channel_unique" UNIQUE("channel")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_logs" ADD COLUMN "provider" text DEFAULT 'meta' NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_logs" ADD COLUMN "wallet_transaction_id" text;--> statement-breakpoint
ALTER TABLE "notification_wallet_transactions" ADD CONSTRAINT "notification_wallet_transactions_wallet_id_notification_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."notification_wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_wallet_transactions" ADD CONSTRAINT "notification_wallet_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_wallet_transaction_id_notification_wallet_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."notification_wallet_transactions"("id") ON DELETE set null ON UPDATE no action;