/** Assets module, public contract. */

export {
  ASSET_TYPES,
  ASSET_SOURCES,
  ASSET_SOURCE_LABELS,
} from "./schema";
export type { AssetType, AssetSource, AssetRow, AssetUsageRow } from "./schema";

export {
  assetInputSchema,
  listAssets,
  getAsset,
  getAssets,
  createAsset,
  uploadAsset,
  ingestFromUrl,
  updateAsset,
  setPreference,
  recordUsage,
  usageHistory,
  publishBlockers,
  orientationFor,
} from "./service";
export type { AssetInput } from "./service";

export { blobStorage } from "./storage";
