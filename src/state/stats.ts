import { computed } from '@preact/signals';
import { skips, submissions } from './session';
import { elapsedMs, targetMinutes } from './timer';

export interface SessionStats {
  reviewed: number;
  skipped: number;
  elapsedMs: number;
  targetMinutes: number;
  sentiment: { like: number; neutral: number; dislike: number; none: number };
  itemsWithEdits: number;
  annotationCount: number;
  arms: { A: number; B: number };
}

/**
 * Reward-screen stats (PRD §7.5) — computed entirely from cached session state;
 * the reward screen makes no stats fetch.
 */
export const sessionStats = computed<SessionStats>(() => {
  const sentiment = { like: 0, neutral: 0, dislike: 0, none: 0 };
  let itemsWithEdits = 0;
  let annotationCount = 0;
  const armCounts = { A: 0, B: 0 };

  for (const s of submissions.value) {
    sentiment[s.draft.sentiment ?? 'none'] += 1;
    if (s.draft.revised_output !== undefined) itemsWithEdits += 1;
    annotationCount += s.draft.partials.length;
    if (s.arm) armCounts[s.arm] += 1;
  }

  return {
    reviewed: submissions.value.length,
    skipped: skips.value.length,
    elapsedMs: elapsedMs.value,
    targetMinutes: targetMinutes.value,
    sentiment,
    itemsWithEdits,
    annotationCount,
    arms: armCounts,
  };
});
