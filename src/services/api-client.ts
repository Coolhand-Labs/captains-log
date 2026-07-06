import { runtimeConfig } from '../config/runtime-config';
import type { ReviewItem } from '../types/review';
import type { FeedbackDraft } from '../types/feedback';

/**
 * Mode-aware feedback submission (PRD §6.2). Demo resolves locally after a
 * beat (feeds the submit toast); real modes are encoded and sent by
 * feedback-encoder.ts. Throwing here is the contract for "do not advance".
 */
export async function submitDraft(item: ReviewItem, draft: FeedbackDraft): Promise<void> {
  const cfg = runtimeConfig.value;
  if (cfg.mode === 'demo') {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return;
  }
  const { encodeAndSubmit } = await import('./feedback-encoder');
  await encodeAndSubmit(cfg, item, draft);
}
