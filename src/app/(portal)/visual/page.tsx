import Link from "next/link";
import {
  gridBatch,
  nextPair,
  nextUnrated,
  getPreference,
  stats,
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  TRAINING_MODES,
  TRAINING_MODE_LABELS,
  type RejectionReason,
  type TrainerStats,
  type TrainingMode,
} from "@/modules/visual";
import { ASSET_SOURCE_LABELS, type AssetRow, type AssetSource } from "@/modules/assets";
import { Masthead, SectionHead, StatusTone, Empty } from "@/components/ui";
import { GridStage, PairStage, RateStage, type StageAsset } from "./stages";
import { compareAction, rateAction, rateManyAction } from "./actions";

export const dynamic = "force-dynamic";

function toStage(a: AssetRow): StageAsset {
  return {
    id: a.id,
    title: a.title,
    source: a.source,
    sourceLabel: ASSET_SOURCE_LABELS[a.source] ?? a.source,
    imageUrl: (a.thumbnailUrl ?? a.fileUrl)!,
  };
}

export default async function VisualTrainerPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: raw } = await searchParams;
  const mode: TrainingMode = (TRAINING_MODES as readonly string[]).includes(raw ?? "")
    ? (raw as TrainingMode)
    : "pair";

  const s = await stats();

  return (
    <div className="space-y-12">
      <Masthead
        title="Visual trainer"
        dateline={`${s.decided} of ${s.trainable} decided`}
        lede="Explicit choices, not engagement. A post that did well may have done well because of the subject or the timing, so what you say here outranks what the numbers said."
      />

      {s.trainable < 2 ? (
        <NotEnough library={s.library} trainable={s.trainable} />
      ) : (
        <>
          <nav className="filters">
            {TRAINING_MODES.map((m) => (
              <Link
                key={m}
                href={m === "pair" ? "/visual" : `/visual?mode=${m}`}
                className="filter"
                data-active={mode === m}
              >
                {TRAINING_MODE_LABELS[m]}
              </Link>
            ))}
          </nav>

          <section className="galley">
            {mode === "pair" ? <PairMode /> : null}
            {mode === "rate" ? <RateMode /> : null}
            {mode === "grid" ? <GridMode /> : null}
          </section>
        </>
      )}

      <Learned stats={s} />
    </div>
  );
}

/* --------------------------------------------------------------- modes --- */

async function PairMode() {
  const pair = await nextPair();
  if (!pair) {
    return <Empty title="Not enough to compare." hint="Two assets with images are needed." />;
  }
  return <PairStage left={toStage(pair[0])} right={toStage(pair[1])} decide={compareAction} />;
}

async function RateMode() {
  const asset = await nextUnrated();
  if (!asset) {
    return (
      <Empty
        title="Everything with an image has a verdict."
        hint="Add more to the library, or use the other two modes to sharpen what is already recorded."
      />
    );
  }
  const existing = await getPreference(asset.id);
  return (
    <RateStage
      asset={toStage(asset)}
      existingRating={existing?.rating ?? null}
      existingReasons={existing?.rejectionReasons ?? []}
      reasonOptions={REJECTION_REASONS.map((key) => ({
        key,
        label: REJECTION_REASON_LABELS[key],
      }))}
      save={rateAction}
    />
  );
}

async function GridMode() {
  const batch = await gridBatch(12);
  if (batch.length < 2) {
    return <Empty title="Not enough to show." hint="Add assets with images to the library." />;
  }
  return <GridStage assets={batch.map(toStage)} save={rateManyAction} />;
}

/* -------------------------------------------------------------- learned --- */

function Learned({ stats: s }: { stats: TrainerStats }) {
  const scale = Math.max(s.topReasons[0]?.count ?? 0, 5);

  return (
    <>
      <section>
        <SectionHead title="What this has learned" aside={`${s.comparisons} comparisons`} />
        <div className="galley">
          <div>
            {s.decided === 0 ? (
              <p className="read text-ink-2">
                Nothing yet. The style guide below carries only the standing art direction rules
                until there are decisions behind it.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <Figure label="Use" value={s.approved} />
                  <Figure label="Maybe" value={s.maybe} />
                  <Figure label="Never" value={s.rejected} />
                  <Figure label="Undecided" value={s.undecided} />
                </div>

                {s.topReasons.length ? (
                  <div className="mt-8">
                    <h3 className="label mb-3">Why things get rejected</h3>
                    <ul className="ruled border-t border-rule">
                      {s.topReasons.map((r) => (
                        <li key={r.key} className="flex items-center gap-4 py-2">
                          <span className="w-56 shrink-0 text-sm">
                            {REJECTION_REASON_LABELS[r.key as RejectionReason] ?? r.key}
                          </span>
                          <span className="h-2 bg-ink" style={{ width: `${(r.count / scale) * 60}%` }} />
                          <span className="mark ml-auto">{r.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {s.sources.ranked.length ? (
                  <div className="mt-8">
                    <h3 className="label mb-3">Which sources earn approval</h3>
                    <ul className="ruled border-t border-rule">
                      {s.sources.ranked.map((row) => (
                        <li key={row.source} className="flex items-baseline gap-4 py-2">
                          <span className="text-sm">
                            {ASSET_SOURCE_LABELS[row.source as AssetSource] ?? row.source}
                          </span>
                          <span className="mark ml-auto">
                            {Math.round(row.rate * 100)}% of {row.total}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {s.sources.tooEarly.length ? (
                  <p className="mark mt-3">
                    Too early to call:{" "}
                    {s.sources.tooEarly
                      .map(
                        (r) =>
                          `${ASSET_SOURCE_LABELS[r.source as AssetSource] ?? r.source} (${r.total})`,
                      )
                      .join(", ")}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="margin-note">
            <p className="label mb-2.5">Exports</p>
            <ul className="space-y-1.5">
              <li>
                <a className="link text-sm" href="/api/v1/visual/style-guide.md">
                  visual-style-guide.md
                </a>
              </li>
              <li>
                <a className="link text-sm" href="/api/v1/visual/preferences.json">
                  visual-preferences.json
                </a>
              </li>
            </ul>
            <p className="mark mt-3">
              Both are built from the decisions above every time they are requested, so there is
              no stale copy to remember to regenerate. The saint-helen-visual-director skill reads
              them before it proposes anything.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="serif tnum text-3xl leading-none">{value}</p>
      <p className="mark mt-1.5">{label}</p>
    </div>
  );
}

function NotEnough({ library, trainable }: { library: number; trainable: number }) {
  return (
    <section className="galley">
      <div>
        <p className="read">
          The trainer needs assets it can show you. The library holds {library}{" "}
          {library === 1 ? "asset" : "assets"}, of which {trainable}{" "}
          {trainable === 1 ? "has" : "have"} an image at a public URL.
        </p>
        <p className="read mt-4 text-ink-2">
          Add them on the assets screen, or POST a batch to the agent API. Anything without a
          public, non expiring image URL is skipped here on purpose, because recording an opinion
          about a grey rectangle would teach the wrong thing.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/assets" className="btn btn-ink">
            Go to assets
          </Link>
        </div>
      </div>
      <div className="margin-note">
        <StatusTone tone="missing">Waiting on the library</StatusTone>
      </div>
    </section>
  );
}
