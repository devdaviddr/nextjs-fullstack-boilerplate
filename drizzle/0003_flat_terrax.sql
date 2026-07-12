ALTER TABLE "users" ADD COLUMN "invite_token_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_expires" timestamp;