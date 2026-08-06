import {
  CONTENT_TYPES,
  PLATFORMS,
  PLATFORM_LABELS,
  PRIORITIES,
} from "@/modules/editorial";
import { listAssets } from "@/modules/assets";
import { Masthead, SectionHead, Field } from "@/components/ui";
import { createContentAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewContentPage() {
  const assets = await listAssets({ limit: 100 });

  return (
    <div className="space-y-10">
      <Masthead
        back={{ href: "/queue", label: "Social queue" }}
        title="New content item"
        lede="Write it once. Platform differences come later, and only where they are real."
      />

      <form action={createContentAction} className="max-w-[40rem] space-y-10">
        <section>
          <SectionHead title="The draft" />
          <div className="space-y-5">
            <Field
              label="Internal title"
              hint="What you would call it in conversation, not the caption."
            >
              <input name="title" required className="input" />
            </Field>

            <Field label="Master caption">
              <textarea name="masterCaption" rows={9} className="input input-prose" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
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
              <span className="label mb-2">Platforms</span>
              <div className="flex flex-wrap gap-x-6 gap-y-2.5">
                {PLATFORMS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="platforms" value={p} />
                    {PLATFORM_LABELS[p]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHead title="Particulars" />
          <div className="grid gap-5 sm:grid-cols-2">
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

            <div className="sm:col-span-2">
              <Field
                label="Missing information"
                hint="One per line. Anything here blocks approval."
              >
                <textarea name="missingInformation" rows={3} className="input" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Creative brief">
                <textarea name="creativeBrief" rows={5} className="input" />
              </Field>
            </div>
          </div>
        </section>

        <div className="border-t border-rule pt-5">
          <button type="submit" className="btn btn-ink">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
