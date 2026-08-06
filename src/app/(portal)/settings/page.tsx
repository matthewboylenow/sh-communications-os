import { MODULES } from "@/core/modules/registry";
import { activeProvider } from "@/modules/publishing";
import { blobStorage } from "@/modules/assets";
import { config } from "@/core/config";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const provider = activeProvider();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-navy-500">
          What is switched on, and what each piece is for.
        </p>
      </header>

      <section>
        <h2 className="text-sm font-semibold">Modules</h2>
        <ul className="mt-2 space-y-2">
          {Object.values(MODULES).map((m) => (
            <li key={m.id} className="card p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{m.title}</p>
                <span
                  className={`chip ${m.enabled ? "bg-navy-900 text-white" : "bg-cream-100 text-navy-500"}`}
                >
                  {m.enabled ? "live" : `phase ${m.phase}`}
                </span>
              </div>
              <p className="mt-1 text-sm text-navy-700">{m.purpose}</p>
              <p className="mt-1 text-xs text-navy-500">
                Tables {m.tablePrefix}*
                {m.dependsOn.length ? ` · depends on ${m.dependsOn.join(", ")}` : ""}
                {m.ports.length ? ` · ports ${m.ports.join(", ")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Connections</h2>
        <ul className="card mt-2 divide-y divide-cream-200">
          <Row
            label="Database"
            value={config.databaseUrl ? "Connected" : "Not configured"}
            ok={Boolean(config.databaseUrl)}
          />
          <Row
            label="Media storage"
            value={blobStorage.isConfigured() ? "Vercel Blob" : "Not configured, add assets by URL"}
            ok={blobStorage.isConfigured()}
          />
          <Row
            label="Publishing provider"
            value={
              provider.name === "manual"
                ? "Manual. Approved captions are copied into Buffer by hand."
                : provider.name
            }
            ok={provider.name !== "manual"}
          />
          <Row
            label="Daily run API"
            value={config.agentToken ? "Token set" : "AGENT_API_TOKEN not set"}
            ok={Boolean(config.agentToken)}
          />
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">The rule that does not move</h2>
        <p className="mt-2 text-sm text-navy-700">
          Nothing publishes without a person approving it. The publishing module can only send
          items that reached approved status, and the default is to land them in Buffer as drafts
          even then. Automation covers research, drafting, organisation, asset matching and
          delivery preparation. It does not cover pastoral judgement, factual approval, quote
          verification, visual taste or the decision to publish.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="font-medium">{label}</span>
      <span className={ok ? "text-navy-700" : "text-navy-500"}>{value}</span>
    </li>
  );
}
