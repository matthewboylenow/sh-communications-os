import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getContent,
  getContentEvents,
  review,
  renderedText,
  APPROVAL_FLAG_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_LIMITS,
  PRIORITIES,
  STATUS_LABELS,
  TRANSITIONS,
  type ContentStatus,
} from "@/modules/editorial";
import { getAsset, publishBlockers, listAssets } from "@/modules/assets";
import { groupsFor } from "@/modules/publishing";
import { currentActor } from "@/core/auth/guards";
import { StatusChip, PriorityChip, Field, fmtDate } from "@/components/ui";
import {
  changeStatusAction,
  clearFlagAction,
  updateContentAction,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function ContentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getContent(id);
  if (!item) notFound();

  const [asset, events, groups, actor, assetOptions] = await Promise.all([
    item.assetId ? getAsset(item.assetId) : Promise.resolve(null),
    getContentEvents(id),
    groupsFor(id),
    currentActor(),
    listAssets({ limit: 100 }),
  ]);

  const state = review(item);
  const assetIssues = item.assetId ? publishBlockers(asset) : [];
  const allBlockers = [...state.blockers, ...assetIssues];
  const canApprove = allBlockers.length === 0 && actor?.role === "admin";
  const nextStatuses = TRANSITIONS[item.status].filter(
    (s) => !["sent_to_buffer", "scheduled", "published"].includes(s),
  );

  const save = updateContentAction.bind(null, id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/queue" className="text-xs text-navy-500">
            &larr; Social queue
          </Link>
          <h1 className="mt-1 truncate text-xl font-semibold">{item.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusChip status={item.status} />
            <PriorityChip priority={item.priority} />
            <span className="text-xs text-navy-500">
              {item.createdByKind === "agent" ? "Drafted by the daily run" : "Created by hand"}
              {item.approvedAt ? ` · approved ${fmtDate(item.approvedAt, true)}` : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((s) => (
            <StatusButton key={s} id={id} to={s} disabled={s === "approved" && !canApprove} />
          ))}
        </div>
      </header>

      {allBlockers.length ? (
        <div className="card border-rust-500 bg-rust-100 p-4">
          <p className="text-sm font-semibold text-rust-600">
            {allBlockers.length} thing{allBlockers.length === 1 ? "" : "s"} before this can be
            approved
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy-900">
            {allBlockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card border-navy-100 bg-navy-50 p-4 text-sm">
          Nothing is blocking this. {actor?.role === "admin" ? "Approve when you are happy with it." : "An admin needs to approve it."}
        </div>
      )}

      {state.uncleared.length ? (
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Approval flags</h2>
          <p className="mt-1 text-xs text-navy-500">
            Each one needs a person to say it is fine. Clearing a flag is recorded with your name.
          </p>
          <ul className="mt-3 space-y-2">
            {state.uncleared.map((flag) => (
              <li key={flag} className="flex items-center justify-between gap-3">
                <span className="text-sm">{APPROVAL_FLAG_LABELS[flag]}</span>
                <form
                  action={async () => {
                    "use server";
                    await clearFlagAction(id, flag);
                  }}
                >
                  <button className="btn-secondary text-xs">Cleared</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form action={save} className="space-y-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Master draft</h2>
          <p className="mt-1 text-xs text-navy-500">
            Every selected platform inherits this unless an override below says otherwise.
          </p>

          <div className="mt-4 space-y-4">
            <Field label="Internal title">
              <input name="title" defaultValue={item.title} className="input" />
            </Field>

            <Field
              label="Master caption"
              hint={`${item.masterCaption.trim().split(/\s+/).filter(Boolean).length} words, ${item.masterCaption.length} characters`}
            >
              <textarea
                name="masterCaption"
                defaultValue={item.masterCaption}
                rows={7}
                className="input font-normal"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Link or call to action">
                <input name="link" defaultValue={item.link ?? ""} className="input" />
              </Field>
              <Field label="Media">
                <select name="assetId" defaultValue={item.assetId ?? ""} className="input">
                  <option value="">No media yet</option>
                  {assetOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.source})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <span className="label">Platforms</span>
              <div className="mt-2 flex flex-wrap gap-3">
                {PLATFORMS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="platforms"
                      value={p}
                      defaultChecked={item.platforms.includes(p)}
                    />
                    {PLATFORM_LABELS[p]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {asset ? (
          <section className="card flex gap-4 p-4">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-md bg-cream-100">
              {asset.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="text-sm">
              <p className="font-medium">{asset.title}</p>
              <p className="text-xs text-navy-500">
                {asset.source} · {asset.orientation ?? "unknown orientation"} · rights{" "}
                {asset.rightsStatus}
              </p>
              {asset.minorReleaseStatus === "unconfirmed" ? (
                <p className="mt-1 text-xs text-rust-600">
                  Shows a minor and the release is unconfirmed.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="card p-5">
          <h2 className="text-sm font-semibold">Platform deltas</h2>
          <p className="mt-1 text-xs text-navy-500">
            Leave a field empty and that platform inherits the master. Only fill in what genuinely
            differs.
          </p>

          {state.deltas.length ? (
            <ul className="mt-3 space-y-1 rounded-md bg-cream-100 p-3 text-sm">
              {state.deltas.map((d) => (
                <li key={d.platform}>
                  <span className="font-medium">{PLATFORM_LABELS[d.platform]}:</span>{" "}
                  {d.changes.join(", ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-md bg-cream-100 p-3 text-sm text-navy-500">
              Every platform is using the master draft as written.
            </p>
          )}

          <div className="mt-4 space-y-3">
            {item.platforms.map((p) => {
              const o = item.overrides?.[p];
              const resolved = state.resolved.find((r) => r.platform === p)!;
              const limits = PLATFORM_LIMITS[p];
              const rendered = renderedText(resolved);
              return (
                <details key={p} className="rounded-md border border-cream-200 p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {PLATFORM_LABELS[p]}{" "}
                    <span
                      className={`text-xs font-normal ${
                        rendered.length > limits.hardChars ? "text-rust-600" : "text-navy-500"
                      }`}
                    >
                      {rendered.length}
                      {limits.hardChars < 3000 ? `/${limits.hardChars}` : ""} chars
                      {resolved.inherited ? " · inherits master" : " · overridden"}
                    </span>
                  </summary>

                  <div className="mt-3 space-y-3">
                    <Field label="Caption override">
                      <textarea
                        name={`ov_${p}_caption`}
                        defaultValue={o?.caption ?? ""}
                        rows={3}
                        placeholder="Empty means it uses the master caption"
                        className="input"
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Hashtags">
                        <input
                          name={`ov_${p}_hashtags`}
                          defaultValue={(o?.hashtags ?? []).join(" ")}
                          placeholder="SaintHelenCommunity"
                          className="input"
                        />
                      </Field>
                      <Field label="Link override">
                        <input name={`ov_${p}_link`} defaultValue={o?.link ?? ""} className="input" />
                      </Field>
                    </div>
                    {p === "instagram" ? (
                      <Field label="First comment">
                        <input
                          name={`ov_${p}_firstComment`}
                          defaultValue={o?.firstComment ?? ""}
                          className="input"
                        />
                      </Field>
                    ) : null}
                    {limits.needsTitle ? (
                      <Field label="Title">
                        <input name={`ov_${p}_title`} defaultValue={o?.title ?? ""} className="input" />
                      </Field>
                    ) : null}

                    <div className="rounded-md bg-navy-900 p-3 text-xs whitespace-pre-wrap text-cream-100">
                      {rendered || "(empty)"}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Priority">
            <select name="priority" defaultValue={item.priority} className="input">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ministry">
            <input name="ministry" defaultValue={item.ministry ?? ""} className="input" />
          </Field>
          <Field label="Publish at">
            <input
              type="datetime-local"
              name="publishAt"
              defaultValue={toLocalInput(item.publishAt)}
              className="input"
            />
          </Field>
          <Field label="Event date">
            <input
              type="datetime-local"
              name="eventDate"
              defaultValue={toLocalInput(item.eventDate)}
              className="input"
            />
          </Field>
          <Field label="Latest useful date" hint="After this it gets retired rather than posted late.">
            <input
              type="datetime-local"
              name="latestUsefulAt"
              defaultValue={toLocalInput(item.latestUsefulAt)}
              className="input"
            />
          </Field>
          <Field label="Source material">
            <input
              name="sourceMaterial"
              defaultValue={item.sourceMaterial ?? ""}
              className="input"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Missing information" hint="One per line. Any entry blocks approval.">
              <textarea
                name="missingInformation"
                defaultValue={item.missingInformation.join("\n")}
                rows={3}
                className="input"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Creative brief">
              <textarea
                name="creativeBrief"
                defaultValue={item.creativeBrief ?? ""}
                rows={5}
                className="input"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea name="notes" defaultValue={item.notes ?? ""} rows={3} className="input" />
            </Field>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary">
            Save
          </button>
          {item.status === "approved" ? (
            <p className="text-xs text-navy-500">
              Saving a change to the caption, media or platforms sends this back to review.
            </p>
          ) : null}
        </div>
      </form>

      {state.voice.length ? (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Voice check</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {state.voice.map((f, i) => (
              <li key={`${f.rule}-${i}`} className="flex gap-2">
                <span
                  className={`chip shrink-0 ${
                    f.level === "error"
                      ? "bg-rust-500 text-white"
                      : f.level === "warning"
                        ? "bg-gold-100 text-gold-600"
                        : "bg-cream-100 text-navy-500"
                  }`}
                >
                  {f.level}
                </span>
                <span>
                  {f.message}
                  {f.match ? <em className="text-navy-500"> — &ldquo;{f.match}&rdquo;</em> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {groups.length ? (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Publication</h2>
          {groups.map((g) => (
            <div key={g.id} className="mt-3 text-sm">
              <p className="text-xs text-navy-500">
                {g.provider} · sent {fmtDate(g.sentAt, true)} · {g.asDraft === "true" ? "as draft" : "scheduled"}
              </p>
              <ul className="mt-1 space-y-1">
                {g.children.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="chip bg-cream-100 text-navy-700">{c.platform}</span>
                    <span className="text-xs">{c.status}</span>
                    {c.publishedUrl ? (
                      <a href={c.publishedUrl} className="text-xs underline" target="_blank" rel="noreferrer">
                        view
                      </a>
                    ) : null}
                    {c.error ? <span className="text-xs text-rust-600">{c.error}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <section className="card p-5">
        <h2 className="text-sm font-semibold">History</h2>
        <ul className="mt-3 space-y-2 text-xs text-navy-700">
          {events.map((e) => (
            <li key={e.id}>
              <span className="text-navy-500">{fmtDate(e.createdAt, true)}</span> —{" "}
              {e.kind.replace(/_/g, " ")}
              {e.fromStatus && e.toStatus ? ` (${STATUS_LABELS[e.fromStatus as ContentStatus]} to ${STATUS_LABELS[e.toStatus as ContentStatus]})` : ""}
              {e.actorLabel ? ` by ${e.actorLabel}` : ""}
              {e.note ? ` — ${e.note}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatusButton({
  id,
  to,
  disabled,
}: {
  id: string;
  to: ContentStatus;
  disabled?: boolean;
}) {
  const action = async () => {
    "use server";
    await changeStatusAction(id, to);
  };
  const cls =
    to === "approved" ? "btn-approve" : to === "retired" ? "btn-danger" : "btn-secondary";
  return (
    <form action={action}>
      <button className={cls} disabled={disabled}>
        {to === "approved" ? "Approve" : STATUS_LABELS[to]}
      </button>
    </form>
  );
}

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
