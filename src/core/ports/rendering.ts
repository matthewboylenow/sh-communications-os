/**
 * Rendering port. Phase 4.
 *
 * Rendering is a queued job, never an inline request. A 90 minute Mass will
 * not transcode inside a serverless function, so the portal's job is to
 * enqueue and to poll. Whether the worker is a box on Railway, a Mac in the
 * office or something else is an implementation detail behind this interface.
 */

export type RenderTemplate = "sunday-homily" | "daily-reflection" | "post-game";

export type RenderRequest = {
  clipId: string;
  sourceUrl: string;
  startSeconds: number;
  endSeconds: number;
  template: RenderTemplate;
  aspect: "9:16" | "1:1" | "16:9";
  captions: { text: string; start: number; end: number }[];
  headline?: string;
  /** Review copies get a visible watermark so an unapproved cut cannot ship. */
  watermark: boolean;
};

export type RenderJob = {
  id: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  outputUrl?: string;
  error?: string;
};

export interface RenderingProvider {
  readonly name: string;
  isConfigured(): boolean;
  enqueue(req: RenderRequest): Promise<RenderJob>;
  getJob(id: string): Promise<RenderJob>;
  cancel(id: string): Promise<void>;
}
