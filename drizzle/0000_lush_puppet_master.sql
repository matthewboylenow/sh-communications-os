CREATE TABLE "core_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"module" text NOT NULL,
	"action" text NOT NULL,
	"subject_id" text,
	"actor_id" text,
	"actor_label" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "core_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ed_content_events" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"actor_id" text,
	"actor_label" text,
	"note" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ed_content_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content_type" text DEFAULT 'announcement' NOT NULL,
	"master_caption" text DEFAULT '' NOT NULL,
	"link" text,
	"asset_id" text,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"publish_at" timestamp with time zone,
	"earliest_publish_at" timestamp with time zone,
	"latest_useful_at" timestamp with time zone,
	"event_date" timestamp with time zone,
	"ministry" text,
	"source_material" text,
	"creative_brief" text,
	"notes" text,
	"approval_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cleared_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missing_information" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"repetition_risk" text,
	"related_content_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text,
	"created_by_kind" text DEFAULT 'human' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"retired_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ed_history_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"normalized" text NOT NULL,
	"content_id" text,
	"used_on" timestamp with time zone DEFAULT now() NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"cooldown_days" integer,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "ed_open_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"owner" text,
	"ministry" text,
	"content_id" text,
	"severity" text DEFAULT 'attention' NOT NULL,
	"due_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolved_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "as_asset_usages" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"context_id" text NOT NULL,
	"context_kind" text DEFAULT 'content' NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"platform" text
);
--> statement-breakpoint
CREATE TABLE "as_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'photo' NOT NULL,
	"source" text DEFAULT 'other' NOT NULL,
	"source_url" text,
	"file_url" text,
	"thumbnail_url" text,
	"storage_key" text,
	"width" integer,
	"height" integer,
	"orientation" text,
	"duration_seconds" integer,
	"byte_size" integer,
	"content_type" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ministries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"people" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rights_status" text DEFAULT 'unknown' NOT NULL,
	"rights_notes" text,
	"minor_release_status" text DEFAULT 'not_applicable' NOT NULL,
	"preference_rating" text,
	"preference_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pb_child_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"platform" text NOT NULL,
	"provider_post_id" text,
	"channel_id" text,
	"status" text DEFAULT 'unknown' NOT NULL,
	"published_url" text,
	"error" text,
	"payload" jsonb,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pb_provider_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'buffer' NOT NULL,
	"provider_channel_id" text NOT NULL,
	"platform" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"active" text DEFAULT 'true' NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pb_publication_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"master_content_id" text NOT NULL,
	"provider" text DEFAULT 'buffer' NOT NULL,
	"provider_group_id" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_by" text,
	"as_draft" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "core_audit_subject_idx" ON "core_audit_log" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "core_audit_created_idx" ON "core_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ed_content_events_content_idx" ON "ed_content_events" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "ed_content_status_idx" ON "ed_content_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ed_content_publish_idx" ON "ed_content_items" USING btree ("publish_at");--> statement-breakpoint
CREATE INDEX "ed_content_priority_idx" ON "ed_content_items" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "ed_history_kind_idx" ON "ed_history_entries" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "ed_history_norm_idx" ON "ed_history_entries" USING btree ("normalized");--> statement-breakpoint
CREATE INDEX "ed_open_flags_resolved_idx" ON "ed_open_flags" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "as_asset_usages_asset_idx" ON "as_asset_usages" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "as_assets_type_idx" ON "as_assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "as_assets_source_idx" ON "as_assets" USING btree ("source");--> statement-breakpoint
CREATE INDEX "as_assets_rights_idx" ON "as_assets" USING btree ("rights_status");--> statement-breakpoint
CREATE INDEX "pb_child_group_idx" ON "pb_child_posts" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "pb_groups_master_idx" ON "pb_publication_groups" USING btree ("master_content_id");