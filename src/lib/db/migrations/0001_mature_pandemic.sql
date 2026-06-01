CREATE TABLE "whatsapp_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"template_key" text NOT NULL,
	"recipient_phone" text NOT NULL,
	"recipient_name" text,
	"message" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error" text,
	"sent_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "whatsapp_logs_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;