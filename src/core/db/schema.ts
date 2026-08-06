/**
 * Schema aggregator.
 *
 * Drizzle needs one entry point, but each module owns its own tables and its
 * own file. The rule that keeps modules replaceable: no foreign key ever
 * crosses a module boundary. Cross-module references are plain text ID columns
 * with a comment saying what they point at. Deleting the media module must not
 * require a migration in editorial.
 */

export * from "./core-schema";
export * from "@/modules/editorial/schema";
export * from "@/modules/assets/schema";
export * from "@/modules/publishing/schema";
export * from "@/modules/visual/schema";
