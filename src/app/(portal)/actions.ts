"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/core/auth";
import { requireActor } from "@/core/auth/guards";
import {
  changeStatus,
  clearFlag,
  createContent,
  updateContent,
  resolveOpenFlag,
  type ActorRef,
  type ApprovalFlag,
  type ContentStatus,
  type Platform,
  type Priority,
} from "@/modules/editorial";
import { createAsset } from "@/modules/assets";

async function actor(cap: Parameters<typeof requireActor>[0]): Promise<ActorRef> {
  const a = await requireActor(cap);
  return { id: a.id, label: a.name, canApprove: a.role === "admin", kind: "human" };
}

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function date(fd: FormData, key: string) {
  const v = str(fd, key);
  return v ? new Date(v) : null;
}
function list(fd: FormData, key: string) {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.length > 0);
}
function lines(fd: FormData, key: string) {
  return (str(fd, key) ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createContentAction(fd: FormData) {
  const a = await actor("content.write");
  const row = await createContent(
    {
      title: str(fd, "title") ?? "Untitled",
      contentType: (str(fd, "contentType") ?? "announcement") as never,
      masterCaption: str(fd, "masterCaption") ?? "",
      link: str(fd, "link"),
      assetId: str(fd, "assetId"),
      platforms: list(fd, "platforms") as Platform[],
      priority: (str(fd, "priority") ?? "normal") as Priority,
      status: "drafting",
      publishAt: date(fd, "publishAt"),
      latestUsefulAt: date(fd, "latestUsefulAt"),
      eventDate: date(fd, "eventDate"),
      ministry: str(fd, "ministry"),
      sourceMaterial: str(fd, "sourceMaterial"),
      missingInformation: lines(fd, "missingInformation"),
      creativeBrief: str(fd, "creativeBrief"),
      notes: str(fd, "notes"),
    },
    a,
  );
  revalidatePath("/queue");
  redirect(`/content/${row.id}`);
}

export async function updateContentAction(id: string, fd: FormData) {
  const a = await actor("content.write");

  const overrides: Record<string, Record<string, unknown>> = {};
  for (const p of ["facebook", "instagram", "x", "tiktok", "youtubeShorts"] as Platform[]) {
    const caption = str(fd, `ov_${p}_caption`);
    const hashtags = (str(fd, `ov_${p}_hashtags`) ?? "")
      .split(/[\s,]+/)
      .map((h) => h.replace(/^#/, "").trim())
      .filter(Boolean);
    const title = str(fd, `ov_${p}_title`);
    const firstComment = str(fd, `ov_${p}_firstComment`);
    const link = str(fd, `ov_${p}_link`);
    const o: Record<string, unknown> = {};
    if (caption) o.caption = caption;
    if (hashtags.length) o.hashtags = hashtags;
    if (title) o.title = title;
    if (firstComment) o.firstComment = firstComment;
    if (link) o.link = link;
    if (Object.keys(o).length) overrides[p] = o;
  }

  await updateContent(
    id,
    {
      title: str(fd, "title") ?? undefined,
      masterCaption: str(fd, "masterCaption") ?? "",
      link: str(fd, "link"),
      assetId: str(fd, "assetId"),
      platforms: list(fd, "platforms") as Platform[],
      overrides: overrides as never,
      priority: (str(fd, "priority") ?? "normal") as Priority,
      publishAt: date(fd, "publishAt"),
      latestUsefulAt: date(fd, "latestUsefulAt"),
      eventDate: date(fd, "eventDate"),
      ministry: str(fd, "ministry"),
      sourceMaterial: str(fd, "sourceMaterial"),
      missingInformation: lines(fd, "missingInformation"),
      creativeBrief: str(fd, "creativeBrief"),
      notes: str(fd, "notes"),
    },
    a,
  );
  revalidatePath(`/content/${id}`);
  revalidatePath("/queue");
}

export async function changeStatusAction(id: string, to: ContentStatus, note?: string) {
  const a = await actor(to === "approved" ? "content.approve" : "content.write");
  await changeStatus(id, to, a, { note });
  revalidatePath(`/content/${id}`);
  revalidatePath("/queue");
  revalidatePath("/");
}

export async function clearFlagAction(id: string, flag: ApprovalFlag, note?: string) {
  const a = await actor("content.approve");
  await clearFlag(id, flag, a, note);
  revalidatePath(`/content/${id}`);
}

export async function resolveFlagAction(id: string, note?: string) {
  await requireActor("content.write");
  await resolveOpenFlag(id, note);
  revalidatePath("/");
}

export async function createAssetAction(fd: FormData) {
  const a = await requireActor("asset.write");
  await createAsset(
    {
      title: str(fd, "title") ?? "Untitled",
      type: (str(fd, "type") ?? "photo") as never,
      source: (str(fd, "source") ?? "other") as never,
      fileUrl: str(fd, "fileUrl"),
      sourceUrl: str(fd, "sourceUrl"),
      thumbnailUrl: str(fd, "fileUrl"),
      tags: (str(fd, "tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      ministries: (str(fd, "ministries") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      rightsStatus: (str(fd, "rightsStatus") ?? "unknown") as never,
      rightsNotes: str(fd, "rightsNotes"),
      minorReleaseStatus: (str(fd, "minorReleaseStatus") ?? "not_applicable") as never,
      notes: str(fd, "notes"),
    },
    a.id,
  );
  revalidatePath("/assets");
}
