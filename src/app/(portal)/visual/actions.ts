"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/core/auth/guards";
import {
  ratePreference,
  recordComparison,
  type ComparisonOutcome,
  type Rating,
  type RejectionReason,
} from "@/modules/visual";

/**
 * Training is a write against the asset library's taste record, so it needs
 * the same capability as editing an asset. A viewer can look at the trainer
 * and cannot teach it anything.
 */
async function actor() {
  const a = await requireActor("asset.write");
  return { id: a.id, label: a.name };
}

export async function compareAction(
  leftAssetId: string,
  rightAssetId: string,
  outcome: ComparisonOutcome,
) {
  await recordComparison({ leftAssetId, rightAssetId, outcome }, await actor());
  revalidatePath("/visual");
  revalidatePath("/assets");
}

export async function rateAction(
  assetId: string,
  rating: Rating,
  rejectionReasons: RejectionReason[] = [],
  notes?: string,
) {
  await ratePreference(
    { assetId, rating, rejectionReasons, tags: [], notes: notes ?? null },
    await actor(),
  );
  revalidatePath("/visual");
  revalidatePath("/assets");
}

export async function rateManyAction(assetIds: string[], rating: Rating) {
  const who = await actor();
  for (const assetId of assetIds) {
    await ratePreference({ assetId, rating, rejectionReasons: [], tags: [] }, who);
  }
  revalidatePath("/visual");
  revalidatePath("/assets");
}
