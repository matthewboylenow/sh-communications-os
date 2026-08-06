import { NextResponse } from "next/server";
import { config } from "@/core/config";

/**
 * Helpers for /api/v1, the surface the scheduled Cowork run talks to.
 * Bearer token, constant-time compare, no cookies, no CSRF surface.
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function agentAuthorized(req: Request): boolean {
  const expected = config.agentToken;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  return presented.length > 0 && timingSafeEqual(presented, expected);
}

export function requireAgent(req: Request) {
  if (!agentAuthorized(req)) {
    return fail("Missing or invalid agent token", 401);
  }
  return null;
}
