ALTER TABLE "ed_content_items" ADD COLUMN "brief" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ed_content_items" ADD COLUMN "reference_url" text;