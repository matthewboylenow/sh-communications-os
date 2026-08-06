CREATE TABLE "vt_comparisons" (
	"id" text PRIMARY KEY NOT NULL,
	"left_asset_id" text NOT NULL,
	"right_asset_id" text NOT NULL,
	"outcome" text NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vt_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"rating" text NOT NULL,
	"rejection_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"asset_source" text,
	"asset_title" text,
	"topic" text,
	"notes" text,
	"decided_by" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "vt_comparisons_left_idx" ON "vt_comparisons" USING btree ("left_asset_id");--> statement-breakpoint
CREATE INDEX "vt_comparisons_right_idx" ON "vt_comparisons" USING btree ("right_asset_id");--> statement-breakpoint
CREATE INDEX "vt_comparisons_decided_idx" ON "vt_comparisons" USING btree ("decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vt_preferences_asset_idx" ON "vt_preferences" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "vt_preferences_rating_idx" ON "vt_preferences" USING btree ("rating");