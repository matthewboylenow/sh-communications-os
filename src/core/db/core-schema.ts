import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createId } from "@/core/lib/ids";

/** Core owns almost nothing. Users and an audit trail, and that is it. */

export const users = pgTable("core_users", {
  id: text("id").primaryKey().$defaultFn(createId),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "editor", "viewer"] })
    .notNull()
    .default("editor"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable(
  "core_audit_log",
  {
    id: text("id").primaryKey().$defaultFn(createId),
    /** Module that produced the entry, e.g. "editorial". */
    module: text("module").notNull(),
    /** Dot-separated action, e.g. "content.status_changed". */
    action: text("action").notNull(),
    /** Free-form subject id. Not a foreign key, on purpose. */
    subjectId: text("subject_id"),
    actorId: text("actor_id"),
    actorLabel: text("actor_label"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("core_audit_subject_idx").on(t.subjectId),
    index("core_audit_created_idx").on(t.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
