/**
 * Transcription port. Phase 3.
 *
 * Word-level timestamps are required, not optional. Clip boundaries are set to
 * the word, and a quote presented as verbatim must be traceable to an exact
 * position in the source audio.
 *
 * `vocabulary` exists because generic models mangle parish proper nouns.
 * "Msgr. Tom", "Meaney Hall", "OCIA", "Cornerstone", "LifeLines" and the names
 * of staff and saints all need to be passed in as hints.
 */

export type TranscriptWord = {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  words: TranscriptWord[];
};

export type Transcript = {
  language: string;
  durationSeconds: number;
  segments: TranscriptSegment[];
  /** Provider name and model, recorded so an old transcript can be explained. */
  engine: string;
};

export interface TranscriptionProvider {
  readonly name: string;
  isConfigured(): boolean;
  transcribe(
    input: { url: string } | { filePath: string },
    opts?: { vocabulary?: string[]; diarize?: boolean },
  ): Promise<Transcript>;
}
