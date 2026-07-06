export type Sentiment = 'like' | 'neutral' | 'dislike';

/** A section-level annotation captured from the coolhand-js partial-feedback widget. */
export interface PartialDraft {
  /** Widget-generated partial_id (or synthesized) — stable across PATCH updates. */
  localId: string;
  /** Transport-synthesized feedback id, used to route widget PATCHes back here. */
  feedbackId?: number;
  focus_range?: { start: number; end: number };
  focus_section?: string;
  sentiment: Sentiment;
  explanation?: string;
}

/**
 * Everything the captain has expressed about one item, accumulated locally.
 * Nothing leaves the browser until "Submit & Next" (see feedback-encoder.ts);
 * Skip discards the draft.
 */
export interface FeedbackDraft {
  sentiment?: Sentiment;
  revised_output?: string;
  explanation?: string;
  partials: PartialDraft[];
}

/** PRD §9.2 single-POST payload — what self-hosted backends receive. */
export interface CaptainFeedbackPayload {
  llm_request_log_id: string;
  creator_unique_id: string;
  creator_type: 'human';
  sentiment?: Sentiment;
  revised_output?: string;
  explanation?: string;
  feedback_partials: Array<{
    focus_range: { start: number; end: number } | null;
    focus_section?: string;
    sentiment?: Sentiment;
    explanation?: string;
  }>;
}

export function likeToSentiment(like: boolean | null | undefined): Sentiment {
  if (like === true) return 'like';
  if (like === false) return 'dislike';
  return 'neutral';
}

export function sentimentToLike(sentiment: Sentiment): boolean | null {
  if (sentiment === 'like') return true;
  if (sentiment === 'dislike') return false;
  return null;
}
