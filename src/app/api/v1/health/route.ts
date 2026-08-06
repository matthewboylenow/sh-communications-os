import { NextResponse } from "next/server";
import { dbConfigured } from "@/core/db";
import { config } from "@/core/config";
import { enabledModules } from "@/core/modules/registry";

export const dynamic = "force-dynamic";

/** Unauthenticated on purpose. Says nothing secret, only what is switched on. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sh-comms-os",
    database: dbConfigured(),
    storage: Boolean(config.blobToken),
    agentApi: Boolean(config.agentToken),
    modules: enabledModules().map((m) => m.id),
    time: new Date().toISOString(),
  });
}
