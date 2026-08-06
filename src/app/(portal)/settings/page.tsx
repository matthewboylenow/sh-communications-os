import { MODULES } from "@/core/modules/registry";
import { activeProvider } from "@/modules/publishing";
import { blobStorage } from "@/modules/assets";
import { config } from "@/core/config";
import { Masthead, SectionHead, StatusTone } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const provider = activeProvider();

  return (
    <div className="space-y-10">
      <Masthead title="Settings" lede="What is switched on, and what each piece is for." />

      <section>
        <SectionHead title="Modules" />
        <ul className="ruled border-t border-rule">
          {Object.values(MODULES).map((m) => (
            <li key={m.id} className="galley py-4">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h3 className="head">{m.title}</h3>
                  <StatusTone tone={m.enabled ? "settled" : "quiet"}>
                    {m.enabled ? "live" : `phase ${m.phase}`}
                  </StatusTone>
                </div>
                <p className="read mt-1.5 text-ink-2">{m.purpose}</p>
              </div>
              <div className="margin-note">
                <p className="mark">
                  tables {m.tablePrefix}*
                  {m.dependsOn.length ? (
                    <>
                      <br />
                      depends on {m.dependsOn.join(", ")}
                    </>
                  ) : null}
                  {m.ports.length ? (
                    <>
                      <br />
                      ports {m.ports.join(", ")}
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHead title="Connections" />
        <dl className="facts max-w-[40rem]">
          <Row
            label="Database"
            value={config.databaseUrl ? "Connected" : "Not configured"}
            ok={Boolean(config.databaseUrl)}
          />
          <Row
            label="Media storage"
            value={
              blobStorage.isConfigured()
                ? "Vercel Blob"
                : "Not configured, add assets by URL"
            }
            ok={blobStorage.isConfigured()}
          />
          <Row
            label="Publishing"
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
        </dl>
      </section>

      <section>
        <SectionHead title="The rule that does not move" />
        <p className="read max-w-[40rem]">
          Nothing publishes without a person approving it. The publishing module can only send
          items that reached approved status, and the default is to land them in Buffer as
          drafts even then. Automation covers research, drafting, organisation, asset matching
          and delivery preparation. It does not cover pastoral judgement, factual approval,
          quote verification, visual taste or the decision to publish.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={ok ? "" : "text-ink-3"}>{value}</dd>
    </>
  );
}
