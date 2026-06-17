-- DPDP 2023 compliant soft-delete: 60-day restoration window before permanent deletion
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_requested_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
