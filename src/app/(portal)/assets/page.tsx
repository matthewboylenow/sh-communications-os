import { listAssets, ASSET_SOURCES, ASSET_TYPES, ASSET_SOURCE_LABELS } from "@/modules/assets";
import { Masthead, SectionHead, Empty, Field, StatusTone, fmtDate, joinMeta } from "@/components/ui";
import { createAssetAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; type?: string }>;
}) {
  const { source, type } = await searchParams;
  const assets = await listAssets({ source, type });

  return (
    <div className="space-y-10">
      <Masthead
        title="Assets"
        lede="Media has to live at a public, non expiring URL. Providers fetch it at publish time, not when you schedule."
      />

      <details className="border-y border-rule py-3.5">
        <summary className="flex items-baseline gap-2 text-[0.9375rem]">
          <span className="caret mark" aria-hidden="true">
            &#8250;
          </span>
          Add an asset
        </summary>
        <form action={createAssetAction} className="mt-5 grid max-w-[40rem] gap-5 sm:grid-cols-2">
          <Field label="Title">
            <input name="title" required className="input" />
          </Field>
          <Field label="File URL" hint="Public and non expiring.">
            <input name="fileUrl" className="input" placeholder="https://..." />
          </Field>
          <Field label="Type">
            <select name="type" className="input" defaultValue="photo">
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select name="source" className="input" defaultValue="other">
              {ASSET_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {ASSET_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source page URL">
            <input name="sourceUrl" className="input" />
          </Field>
          <Field label="Tags" hint="Comma separated.">
            <input name="tags" className="input" />
          </Field>
          <Field label="Rights">
            <select name="rightsStatus" className="input" defaultValue="unknown">
              <option value="approved">Approved for parish use</option>
              <option value="restricted">Restricted</option>
              <option value="unknown">Not checked yet</option>
            </select>
          </Field>
          <Field label="Shows a minor?">
            <select name="minorReleaseStatus" className="input" defaultValue="not_applicable">
              <option value="not_applicable">No minors in it</option>
              <option value="confirmed">Yes, release confirmed</option>
              <option value="unconfirmed">Yes, release not confirmed</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <input name="notes" className="input" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-ink">Add</button>
          </div>
        </form>
      </details>

      <section>
        <SectionHead title="Library" count={assets.length} />
        {assets.length === 0 ? (
          <Empty
            title="No assets yet."
            hint="Add one above, or import a batch through the API."
          />
        ) : (
          /*
           * Plates, not crops. Each asset is shown whole on a sunk ground with
           * its particulars beneath, because how a photo gets cropped is an
           * editorial decision and the library does not get to make it quietly.
           */
          <ul className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((a) => (
              <li key={a.id}>
                <div className="plate aspect-4/3 w-full">
                  {a.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumbnailUrl} alt="" />
                  ) : (
                    <span className="mark">{a.type}</span>
                  )}
                </div>
                <p className="mt-2 truncate text-sm">{a.title}</p>
                <p className="mark mt-0.5 truncate">
                  {joinMeta([ASSET_SOURCE_LABELS[a.source], fmtDate(a.createdAt)])}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  <StatusTone
                    tone={
                      a.rightsStatus === "approved"
                        ? "settled"
                        : a.rightsStatus === "restricted"
                          ? "act"
                          : "missing"
                    }
                  >
                    {a.rightsStatus === "approved" ? "cleared" : a.rightsStatus}
                  </StatusTone>
                  {a.minorReleaseStatus === "unconfirmed" ? (
                    <StatusTone tone="act">minor unconfirmed</StatusTone>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
