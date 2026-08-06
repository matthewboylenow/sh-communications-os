import Link from "next/link";
import {
  CONTENT_TYPES,
  PLATFORMS,
  PLATFORM_LABELS,
  PRIORITIES,
} from "@/modules/editorial";
import { listAssets } from "@/modules/assets";
import { Field } from "@/components/ui";
import { createContentAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewContentPage() {
  const assets = await listAssets({ limit: 100 });

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <Link href="/queue" className="text-xs text-navy-500">
          &larr; Social queue
        </Link>
        <h1 className="mt-1 text-xl font-semibold">New content item</h1>
        <p className="mt-1 text-sm text-navy-500">
          Write it once. Platform differences come later, and only where they are real.
        </p>
      </header>

      <form action={createContentAction} className="card space-y-4 p-5">
        <Field label="Internal title" hint="What you would call it in conversation, not the caption.">
          <input name="title" required className="input" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Content type">
            <select name="contentType" className="input" defaultValue="announcement">
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" className="input" defaultValue="normal">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Master caption">
          <textarea name="masterCaption" rows={7} className="input" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link">
            <input name="link" className="input" placeholder="https://sainthelen.org/..." />
          </Field>
          <Field label="Media">
            <select name="assetId" className="input" defaultValue="">
              <option value="">Pick later</option>
              {assets.map((a) => (
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
                <input type="checkbox" name="platforms" value={p} />
                {PLATFORM_LABELS[p]}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Publish at">
            <input type="datetime-local" name="publishAt" className="input" />
          </Field>
          <Field label="Event date">
            <input type="datetime-local" name="eventDate" className="input" />
          </Field>
          <Field label="Latest useful date">
            <input type="datetime-local" name="latestUsefulAt" className="input" />
          </Field>
          <Field label="Ministry">
            <input name="ministry" className="input" />
          </Field>
        </div>

        <Field label="Missing information" hint="One per line. Anything here blocks approval.">
          <textarea name="missingInformation" rows={3} className="input" />
        </Field>

        <Field label="Creative brief">
          <textarea name="creativeBrief" rows={4} className="input" />
        </Field>

        <button type="submit" className="btn-primary">
          Create
        </button>
      </form>
    </div>
  );
}
