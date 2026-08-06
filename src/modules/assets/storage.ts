import { put, del } from "@vercel/blob";
import { config } from "@/core/config";
import type { StorageProvider, StoredObject } from "@/core/ports/storage";

/**
 * Vercel Blob implementation of the storage port.
 *
 * `addRandomSuffix: false` plus our own ID in the key means the URL is stable
 * and predictable. `access: "public"` matters: Buffer and every other provider
 * fetches media at publish time, so a signed URL that expires in an hour will
 * work in testing and fail at 8am on a Sunday.
 */
export const blobStorage: StorageProvider = {
  name: "vercel-blob",

  isConfigured() {
    return Boolean(config.blobToken);
  },

  async put(key, body, opts): Promise<StoredObject> {
    const result = await put(key, body as Blob, {
      access: "public",
      token: config.blobToken,
      contentType: opts?.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    const size =
      body instanceof Blob
        ? body.size
        : body instanceof ArrayBuffer
          ? body.byteLength
          : body.length;
    return {
      key,
      publicUrl: result.url,
      contentType: opts?.contentType ?? "application/octet-stream",
      size,
    };
  },

  async remove(key) {
    await del(key, { token: config.blobToken });
  },
};
