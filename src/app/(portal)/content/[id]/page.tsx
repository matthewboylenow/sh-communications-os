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
import {
  Status,
  StatusTone,
  PriorityNote,
  Masthead,
  SectionHead,
  Field,
  fmtDate,
  joinMeta,
} from "@/components/ui";
import { Proof, type ExtraNote } from "@/components/proof";
import { changeStatusAction, clearFlagAction, updateContentAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function ContentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const editing = edit === "1";

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
  /** Approve is the decision. Everything else is just moving it along. */
  const moves = nextStatuses.filter((s) => s !== "approved");

  const back = `/content/${id}`;

  /*
   * Everything the system objects to, other than the voice findings, which the
   * proof places itself. Each one carries the link to the field that fixes it,
   * so a mark in the margin is a route to the repair rather than a complaint.
   */
  const extras: ExtraNote[] = [
    ...(item.platforms.length
      ? []
      : [{ level: "error" as const, message: "No platform selected.", href: `${back}?edit=1#platforms` }]),
    ...state.platformIssues
      .filter((i) => i.level === "blocker")
      .map((i) => ({
        level: "error" as const,
        message: `${PLATFORM_LABELS[i.platform]}: ${i.message}`,
        href: `${back}?edit=1#platforms`,
      })),
    ...item.missingInformation.map((m) => ({
      level: "missing" as const,
      message: m,
      href: `${back}?edit=1#missing`,
    })),
    ...state.uncleared.map((f) => ({
      level: "flag" as const,
      message: `${APPROVAL_FLAG_LABELS[f]}, not cleared.`,
    })),
    ...assetIssues.map((m) => ({ level: "error" as const, message: m, href: "/assets" })),
  ];

  return (
    <div className="space-y-12">
      <Masthead
        back={{ href: "/queue", label: "Social queue" }}
        title={item.title}
        dateline={joinMeta([
          item.createdByKind === "agent" ? "Drafted by the daily run" : "Created by hand",
          item.approvedAt ? `approved ${fmtDate(item.approvedAt, true)}` : null,
          item.publishAt ? `publishes ${fmtDate(item.publishAt, true)}` : "unscheduled",
        ])}
        action={
          <>
            {editing ? (
              <Link href={back} className="btn btn-outline">
                Done editing
              </Link>
            ) : (
              <Link href={`${back}?edit=1`} className="btn btn-outline">
                Edit
              </Link>
            )}
            {nextStatuses.includes("approved") ? (
              <StatusButton id={id} to="approved" disabled={!canApprove} />
            ) : null}
          </>
        }
      />

      {/*
       * One primary action lives in the nameplate. The rest of the status
       * machine is apparatus and is set as apparatus, because a screen with six
       * buttons of equal weight is a screen that has not decided anything.
       */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule pb-4">
        <Status status={item.status} />
        <PriorityNote priority={item.priority} />
        {allBlockers.length === 0 ? (
          <StatusTone tone="settled">
            {actor?.role === "admin"
              ? "Nothing is blocking this"
              : "Clean, but an admin has to approve it"}
          </StatusTone>
        ) : (
          <StatusTone tone="act">
            {allBlockers.length} thing{allBlockers.length === 1 ? "" : "s"} before this can be
            approved
          </StatusTone>
        )}

        {moves.length ? (
          <span className="ml-auto flex flex-wrap items-center gap-x-1 gap-y-1">
            <span className="mark mr-1">move to</span>
            {moves.map((s) => (
              <StatusButton key={s} id={id} to={s} small />
            ))}
          </span>
        ) : null}
      </div>

      {editing ? (
        <EditForm
          id={id}
          item={item}
          assetOptions={assetOptions}
          back={back}
        />
      ) : (
        <>
          <section>
            <SectionHead title="The draft" aside={`${wordCount(item.masterCaption)} words`} />
            <Proof
              text={item.masterCaption}
              findings={state.voice}
              extras={extras}
              empty="No caption yet. Nothing can go out until there is one."
            />
          </section>

          {state.uncleared.length ? (
            <section>
              <SectionHead title="Clearances" />
              <p className="apparatus mb-3 max-w-[40rem]">
                Each one needs a person to say it is fine. Clearing a flag is recorded with
                your name against it.
              </p>
              <ul className="ruled border-t border-rule">
                {state.uncleared.map((flag) => (
                  <li key={flag} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-[0.9375rem]">{APPROVAL_FLAG_LABELS[flag]}</span>
                    <form
                      action={async () => {
                        "use server";
                        await clearFlagAction(id, flag);
                      }}
                    >
                      <button className="btn btn-outline btn-sm">Cleared</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {asset ? (
            <section>
              <SectionHead title="Media" />
              <div className="galley">
                {/* A plate when there is something to look at. A single line
                    when there is not, because a large empty rectangle tells a
                    person nothing they did not already know. */}
                {asset.thumbnailUrl ? (
                  <div className="plate aspect-4/3 max-h-[20rem] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.thumbnailUrl} alt="" />
                  </div>
                ) : (
                  <div className="plate h-20 w-full">
                    <span className="mark">{asset.type}, no preview available</span>
                  </div>
                )}
                <div className="margin-note">
                  <p className="text-[0.9375rem]">{asset.title}</p>
                  <p className="mark mt-1.5">
                    {joinMeta([
                      asset.source,
                      asset.orientation ?? "orientation unknown",
                      `rights ${asset.rightsStatus}`,
                    ])}
                  </p>
                  {asset.minorReleaseStatus === "unconfirmed" ? (
                    <p className="note mt-2.5" data-level="error">
                      <span className="note-glyph" aria-hidden="true">
                        §
                      </span>
                      <span>Shows a minor and the release is unconfirmed.</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <SectionHead
              title="What each platform gets"
              aside={state.deltas.length ? `${state.deltas.length} differ` : "all inherit"}
            />
            {item.platforms.length === 0 ? (
              <p className="read text-ink-2">No platform is selected yet.</p>
            ) : (
              <ul className="ruled border-t border-rule">
                {item.platforms.map((p) => {
                  const resolved = state.resolved.find((r) => r.platform === p)!;
                  const limits = PLATFORM_LIMITS[p];
                  const rendered = renderedText(resolved);
                  const over = rendered.length > limits.hardChars;
                  const delta = state.deltas.find((d) => d.platform === p);

                  return (
                    <li key={p} className="galley py-3.5">
                      <div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                          <h3 className="head">{PLATFORM_LABELS[p]}</h3>
                          <span className={`mark ${over ? "text-accent" : ""}`}>
                            {rendered.length}
                            {limits.hardChars < 3000 ? ` / ${limits.hardChars}` : ""} chars
                          </span>
                        </div>
                        {/*
                          Only set the text out again when it genuinely differs.
                          Five near identical captions on one screen is the exact
                          thing the master draft exists to prevent.
                        */}
                        {delta ? (
                          <p className="read mt-2 whitespace-pre-line text-ink-2">
                            {rendered || "(empty)"}
                          </p>
                        ) : null}
                      </div>
                      <div className="margin-note">
                        {delta ? (
                          <p className="note" data-level="note">
                            <span className="note-glyph" aria-hidden="true">
                              ?
                            </span>
                            <span>{delta.changes.join(", ")}</span>
                          </p>
                        ) : (
                          <p className="mark">word for word the master</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <SectionHead title="Particulars" />
            <dl className="facts max-w-[40rem]">
              <dt>Content type</dt>
              <dd>{item.contentType.replace(/_/g, " ")}</dd>
              <dt>Ministry</dt>
              <dd>{item.ministry ?? <Blank />}</dd>
              <dt>Publish at</dt>
              <dd className="mark text-sm">
                {fmtDate(item.publishAt, true) ?? <Blank />}
              </dd>
              <dt>Event date</dt>
              <dd className="mark text-sm">{fmtDate(item.eventDate, true) ?? <Blank />}</dd>
              <dt>Useful until</dt>
              <dd className="mark text-sm">
                {fmtDate(item.latestUsefulAt, true) ?? <Blank />}
              </dd>
              <dt>Link</dt>
              <dd className="truncate">
                {item.link ? (
                  <a href={item.link} className="link" target="_blank" rel="noreferrer">
                    {item.link}
                  </a>
                ) : (
                  <Blank />
                )}
              </dd>
              <dt>Source material</dt>
              <dd>{item.sourceMaterial ?? <Blank />}</dd>
              <dt>Repetition risk</dt>
              <dd>{item.repetitionRisk ?? <Blank />}</dd>
            </dl>

            {item.creativeBrief ? (
              <div className="mt-8 max-w-[40rem]">
                <h3 className="label mb-2">Creative brief</h3>
                <p className="read whitespace-pre-line text-ink-2">{item.creativeBrief}</p>
              </div>
            ) : null}

            {item.notes ? (
              <div className="mt-6 max-w-[40rem]">
                <h3 className="label mb-2">Notes</h3>
                <p className="read whitespace-pre-line text-ink-2">{item.notes}</p>
              </div>
            ) : null}
          </section>

          {groups.length ? (
            <section>
              <SectionHead title="Publication" />
              {groups.map((g) => (
                <div key={g.id} className="max-w-[40rem]">
                  <p className="mark">
                    {joinMeta([
                      g.provider,
                      `sent ${fmtDate(g.sentAt, true)}`,
                      g.asDraft === "true" ? "as draft" : "scheduled",
                    ])}
                  </p>
                  <ul className="ruled mt-2 border-t border-rule">
                    {g.children.map((c) => (
                      <li key={c.id} className="flex items-baseline justify-between gap-4 py-2">
                        <span className="apparatus">{c.platform}</span>
                        <span className="flex items-baseline gap-3">
                          <span className="mark">{c.status}</span>
                          {c.publishedUrl ? (
                            <a
                              href={c.publishedUrl}
                              className="link text-sm"
                              target="_blank"
                              rel="noreferrer"
                            >
                              view
                            </a>
                          ) : null}
                          {c.error ? <span className="mark text-accent">{c.error}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}

          <section>
            <SectionHead title="Record" count={events.length} />
            <ol className="ruled max-w-[40rem] border-t border-rule">
              {events.map((e) => (
                <li key={e.id} className="flex gap-4 py-2">
                  <span className="mark w-32 shrink-0 whitespace-nowrap">
                    {fmtDate(e.createdAt, true)}
                  </span>
                  <span className="apparatus min-w-0 flex-1">
                    {e.kind.replace(/_/g, " ")}
                    {e.fromStatus && e.toStatus
                      ? `, ${STATUS_LABELS[e.fromStatus as ContentStatus]} to ${STATUS_LABELS[e.toStatus as ContentStatus]}`
                      : ""}
                    {e.actorLabel ? `, by ${e.actorLabel}` : ""}
                    {e.note ? `. ${e.note}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}

function Blank() {
  return <span className="text-ink-3">not set</span>;
}

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/* ---------------------------------------------------------------- edit --- */

type Item = NonNullable<Awaited<ReturnType<typeof getContent>>>;
type AssetOption = Awaited<ReturnType<typeof listAssets>>[number];

function EditForm({
  id,
  item,
  assetOptions,
  back,
}: {
  id: string;
  item: Item;
  assetOptions: AssetOption[];
  back: string;
}) {
  const save = updateContentAction.bind(null, id);

  return (
    <form action={save} className="space-y-12">
      <section>
        <SectionHead title="Master draft" />
        <p className="apparatus mb-4 max-w-[40rem]">
          Every selected platform inherits this unless an override below says otherwise.
        </p>

        <div className="max-w-[40rem] space-y-5">
          <Field label="Internal title">
            <input name="title" defaultValue={item.title} className="input" />
          </Field>

          <Field
            label="Master caption"
            hint={`${wordCount(item.masterCaption)} words, ${item.masterCaption.length} characters`}
          >
            <textarea
              name="masterCaption"
              defaultValue={item.masterCaption}
              rows={10}
              className="input input-prose"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
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

          <div id="platforms" className="scroll-mt-8">
            <span className="label mb-2">Platforms</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2.5">
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

      <section>
        <SectionHead title="Platform deltas" />
        <p className="apparatus mb-4 max-w-[40rem]">
          Leave a field empty and that platform inherits the master. Only fill in what
          genuinely differs.
        </p>

        {item.platforms.length === 0 ? (
          <p className="read text-ink-2">Select a platform first.</p>
        ) : (
          <div className="ruled max-w-[40rem] border-t border-rule">
            {item.platforms.map((p) => {
              const o = item.overrides?.[p];
              const limits = PLATFORM_LIMITS[p];
              return (
                <details key={p} className="py-3">
                  <summary className="flex items-baseline gap-2 text-[0.9375rem]">
                    <span className="caret mark" aria-hidden="true">
                      &#8250;
                    </span>
                    {PLATFORM_LABELS[p]}
                    <span className="mark ml-auto">{o ? "overridden" : "inherits"}</span>
                  </summary>

                  <div className="mt-4 space-y-4 pl-5">
                    <Field label="Caption override">
                      <textarea
                        name={`ov_${p}_caption`}
                        defaultValue={o?.caption ?? ""}
                        rows={4}
                        placeholder="Empty means it uses the master caption"
                        className="input input-prose"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Hashtags">
                        <input
                          name={`ov_${p}_hashtags`}
                          defaultValue={(o?.hashtags ?? []).join(" ")}
                          placeholder="SaintHelenCommunity"
                          className="input"
                        />
                      </Field>
                      <Field label="Link override">
                        <input
                          name={`ov_${p}_link`}
                          defaultValue={o?.link ?? ""}
                          className="input"
                        />
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
                        <input
                          name={`ov_${p}_title`}
                          defaultValue={o?.title ?? ""}
                          className="input"
                        />
                      </Field>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHead title="Particulars" />
        <div className="grid max-w-[40rem] gap-5 sm:grid-cols-2">
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
          <Field
            label="Latest useful date"
            hint="After this it gets retired rather than posted late."
          >
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

          <div className="sm:col-span-2" id="missing">
            <Field
              label="Missing information"
              hint="One per line. Any entry blocks approval."
            >
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
                rows={6}
                className="input"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea name="notes" defaultValue={item.notes ?? ""} rows={3} className="input" />
            </Field>
          </div>
        </div>
      </section>

      {/* Sits against the bottom of the window so a long form never hides the
          one control that matters. */}
      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-4 border-t border-rule bg-paper px-5 py-3.5 sm:-mx-8 sm:px-8">
        <button type="submit" className="btn btn-ink">
          Save
        </button>
        <Link href={back} className="btn btn-quiet">
          Cancel
        </Link>
        {item.status === "approved" ? (
          <p className="mark max-w-sm">
            Saving a change to the caption, media or platforms sends this back to review.
          </p>
        ) : null}
      </div>
    </form>
  );
}

function StatusButton({
  id,
  to,
  disabled,
  small,
}: {
  id: string;
  to: ContentStatus;
  disabled?: boolean;
  small?: boolean;
}) {
  const action = async () => {
    "use server";
    await changeStatusAction(id, to);
  };
  // Retiring is not a destructive act and should not shout like one. It gets
  // the accent on hover, not at rest.
  const cls = to === "approved" ? "btn-approve" : "btn-quiet";
  return (
    <form action={action}>
      <button className={`btn ${cls} ${small ? "btn-sm" : ""}`} disabled={disabled}>
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
