import { listAssets, ASSET_SOURCES, ASSET_TYPES, ASSET_SOURCE_LABELS } from "@/modules/assets";
import { Empty, Field, fmtDate } from "@/components/ui";
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
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Assets</h1>
        <p className="mt-1 text-sm text-navy-500">
          Media has to live at a public, non-expiring URL. Publishing providers fetch it at
          publish time, not when you schedule.
        </p>
      </header>

      <details className="card p-5">
        <summary className="cursor-pointer text-sm font-semibold">Add an asset</summary>
        <form action={createAssetAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <input name="title" required className="input" />
          </Field>
          <Field label="File URL" hint="Public and non-expiring.">
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
            <button className="btn-primary">Add</button>
          </div>
        </form>
      </details>

      {assets.length === 0 ? (
        <Empty title="No assets yet" hint="Add one above, or import a batch through the API." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <li key={a.id} className="card overflow-hidden">
              <div className="aspect-square bg-cream-100">
                {a.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-navy-500">
                    {a.type}
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="text-xs text-navy-500">
                  {ASSET_SOURCE_LABELS[a.source]} · {fmtDate(a.createdAt)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span
                    className={`chip ${
                      a.rightsStatus === "approved"
                        ? "bg-navy-100 text-navy-900"
                        : a.rightsStatus === "restricted"
                          ? "bg-rust-100 text-rust-600"
                          : "bg-cream-100 text-navy-500"
                    }`}
                  >
                    {a.rightsStatus}
                  </span>
                  {a.minorReleaseStatus === "unconfirmed" ? (
                    <span className="chip bg-rust-500 text-white">minor unconfirmed</span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
