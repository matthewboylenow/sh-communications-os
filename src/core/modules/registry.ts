/**
 * Module registry.
 *
 * Every feature in Communications OS is a module. A module owns its own
 * database tables, its own service layer, and its own routes. Modules never
 * import each other's internals. They talk through three things and nothing
 * else:
 *
 *   1. The public index.ts of another module (a typed service contract)
 *   2. The event bus in core/events
 *   3. A port in core/ports, when the dependency is on an outside system
 *
 * Adding a module means adding a manifest entry here. Removing one means
 * deleting its folder and its entry. If deleting a folder breaks a different
 * module's code, the boundary was violated and that is a bug.
 */

export type ModuleId =
  | "editorial"
  | "assets"
  | "publishing"
  | "visual"
  | "media";

export type ModulePhase = 1 | 2 | 3 | 4 | 5 | 6;

export type ModuleManifest = {
  id: ModuleId;
  title: string;
  /** Short sentence a human can read on the settings page. */
  purpose: string;
  /** Table name prefix this module owns. Nothing else may write these tables. */
  tablePrefix: string;
  /** Build phase from the project plan. */
  phase: ModulePhase;
  /** false means the folder exists but the feature is not live yet. */
  enabled: boolean;
  /** Modules whose public contract this one calls. Keep this honest. */
  dependsOn: ModuleId[];
  /** Ports (outside systems) this module needs to do its job. */
  ports: string[];
  /** Nav entry, when the module has a UI. */
  nav?: { href: string; label: string; order: number };
};

export const MODULES: Record<ModuleId, ModuleManifest> = {
  editorial: {
    id: "editorial",
    title: "Editorial",
    purpose:
      "Master content items, platform deltas, status workflow and approval. The editorial source of truth.",
    tablePrefix: "ed_",
    phase: 1,
    enabled: true,
    dependsOn: [],
    ports: [],
    nav: { href: "/queue", label: "Social queue", order: 10 },
  },
  assets: {
    id: "assets",
    title: "Assets",
    purpose:
      "Media library. Photos, graphics, templates and video, with rights, tags and usage history.",
    tablePrefix: "as_",
    phase: 1,
    enabled: true,
    dependsOn: [],
    ports: ["storage"],
    nav: { href: "/assets", label: "Assets", order: 20 },
  },
  publishing: {
    id: "publishing",
    title: "Publishing",
    purpose:
      "Sends approved master items to a publishing provider and records what came back. Delivery only, never editorial.",
    tablePrefix: "pb_",
    phase: 5,
    enabled: false,
    dependsOn: ["editorial"],
    ports: ["publishing"],
  },
  visual: {
    id: "visual",
    title: "Visual trainer",
    purpose:
      "Learns Matthew's visual taste through explicit choices and exports a style guide the creative brief step reads.",
    tablePrefix: "vt_",
    phase: 2,
    enabled: false,
    dependsOn: ["assets"],
    ports: [],
    nav: { href: "/visual", label: "Visual trainer", order: 30 },
  },
  media: {
    id: "media",
    title: "Media intelligence",
    purpose:
      "Homily and livestream transcripts, clip candidates, scoring and rendering.",
    tablePrefix: "md_",
    phase: 3,
    enabled: false,
    dependsOn: ["editorial", "assets"],
    ports: ["transcription", "rendering", "storage"],
    nav: { href: "/media", label: "Media intelligence", order: 40 },
  },
};

export function enabledModules(): ModuleManifest[] {
  return Object.values(MODULES).filter((m) => m.enabled);
}

export function navItems() {
  return enabledModules()
    .filter((m) => m.nav)
    .map((m) => m.nav!)
    .sort((a, b) => a.order - b.order);
}
