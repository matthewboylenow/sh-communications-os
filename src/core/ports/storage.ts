/**
 * Storage port.
 *
 * Vercel Blob is the first implementation. S3 or R2 would be another. The one
 * requirement that is not negotiable: `publicUrl` must be stable and must not
 * expire, because publishing providers fetch media at publish time rather than
 * at schedule time.
 */

export type StoredObject = {
  key: string;
  publicUrl: string;
  contentType: string;
  size: number;
};

export interface StorageProvider {
  readonly name: string;
  isConfigured(): boolean;
  put(
    key: string,
    body: Blob | ArrayBuffer | Uint8Array,
    opts?: { contentType?: string },
  ): Promise<StoredObject>;
  remove(key: string): Promise<void>;
}
