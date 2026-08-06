import { auth } from "./index";

export type Actor = { id: string; name: string; email: string; role: Role };
export type Role = "admin" | "editor" | "viewer";

/**
 * One capability matrix. The v3 codebase learned this the hard way: the same
 * role check copy-pasted into two dozen files drifts into three spellings and
 * two of them end up wrong. Everything asks this table instead.
 */
const CAN = {
  "content.read": ["admin", "editor", "viewer"],
  "content.write": ["admin", "editor"],
  "content.approve": ["admin"],
  "content.send": ["admin"],
  "asset.read": ["admin", "editor", "viewer"],
  "asset.write": ["admin", "editor"],
  "settings.write": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAN;

export function can(role: Role | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (CAN[capability] as readonly string[]).includes(role);
}

export async function currentActor(): Promise<Actor | null> {
  const session = await auth();
  const u = session?.user as
    | { id?: string; name?: string | null; email?: string | null; role?: string }
    | undefined;
  if (!u?.id) return null;
  return {
    id: u.id,
    name: u.name ?? "Unknown",
    email: u.email ?? "",
    role: (u.role as Role) ?? "editor",
  };
}

export async function requireActor(capability: Capability): Promise<Actor> {
  const actor = await currentActor();
  if (!actor) throw new AuthError("Not signed in");
  if (!can(actor.role, capability)) {
    throw new AuthError(`Role "${actor.role}" cannot ${capability}`);
  }
  return actor;
}

export class AuthError extends Error {
  readonly code = "UNAUTHORIZED";
}
