import type { RuntimeConfig } from '../config/runtime-config';
import type { ReviewItem } from '../types/review';
import type { CaptainFeedbackPayload, FeedbackDraft, Sentiment } from '../types/feedback';
import { COLLECTOR, COOLHAND_FEEDBACK_URL } from '../config/constants';
import { getAuthHeaders } from './auth/auth';

/**
 * Turns an accumulated FeedbackDraft into real submissions, per mode:
 *
 * - self_hosted: ONE POST in the PRD §9.2 shape — sentiment, revised_output,
 *   explanation, and feedback_partials[] aggregated in a single body.
 * - coolhand: decomposed into TODAY'S actual wire format — the platform accepts
 *   no feedback_partials[] array, so the draft becomes one main record plus one
 *   record per partial, each `{ llm_request_log_feedback: {...} }` (see
 *   docs/coolhand-issues/03 for the aspirational aggregated endpoint).
 * - both: the same draft goes to both targets; any failure throws so the game
 *   never advances past an unsaved item. Successful records are remembered per
 *   item, so a retry resumes idempotently instead of duplicating.
 */

export interface CoolhandWireRecord {
  llm_request_log_feedback: {
    sentiment: Sentiment;
    original_output: string;
    workload_hashid: string;
    creator_unique_id: string;
    creator_type: 'human';
    collector: string;
    llm_request_log_id?: number;
    revised_output?: string;
    explanation?: string;
    focus_section?: string;
    focus_range?: { start: number; end: number };
  };
}

export function encodePrdPayload(
  item: ReviewItem,
  draft: FeedbackDraft,
  creatorId: string,
): CaptainFeedbackPayload {
  return {
    llm_request_log_id: item.id,
    creator_unique_id: creatorId,
    creator_type: 'human',
    sentiment: draft.sentiment,
    revised_output: draft.revised_output,
    explanation: draft.explanation,
    feedback_partials: draft.partials.map((p) => ({
      focus_range: p.focus_range ?? null,
      focus_section: p.focus_section,
      sentiment: p.sentiment,
      explanation: p.explanation,
    })),
  };
}

export function encodeCoolhandRecords(
  item: ReviewItem,
  draft: FeedbackDraft,
  creatorId: string,
): CoolhandWireRecord[] {
  const numericId = Number(item.id);
  const base = {
    original_output: item.original_output,
    workload_hashid: item.workload_id,
    creator_unique_id: creatorId,
    creator_type: 'human' as const,
    collector: COLLECTOR,
    // Exact-match field when the queue exposes numeric Coolhand log ids;
    // otherwise original_output serves as the fuzzy matching field.
    ...(Number.isFinite(numericId) && { llm_request_log_id: numericId }),
  };

  const records: CoolhandWireRecord[] = [];
  if (draft.sentiment || draft.revised_output || draft.explanation) {
    records.push({
      llm_request_log_feedback: {
        ...base,
        sentiment: draft.sentiment ?? 'neutral',
        ...(draft.revised_output !== undefined && { revised_output: draft.revised_output }),
        ...(draft.explanation !== undefined && { explanation: draft.explanation }),
      },
    });
  }
  for (const p of draft.partials) {
    records.push({
      llm_request_log_feedback: {
        ...base,
        sentiment: p.sentiment,
        ...(p.focus_section !== undefined && { focus_section: p.focus_section }),
        ...(p.focus_range !== undefined && { focus_range: p.focus_range }),
        ...(p.explanation !== undefined && { explanation: p.explanation }),
      },
    });
  }
  return records;
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<void> {
  // Plain fetch is safe: the transport wrapper only intercepts the widget
  // capture sentinel, never real API endpoints.
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Feedback submission failed (${res.status}) at ${url}`);
  }
}

/** Per-item record of what already landed, so retries resume instead of duplicating. */
const completed = new Map<string, Set<string>>();

function alreadyDone(itemId: string, key: string): boolean {
  return completed.get(itemId)?.has(key) ?? false;
}

function markDone(itemId: string, key: string): void {
  const set = completed.get(itemId) ?? new Set<string>();
  set.add(key);
  completed.set(itemId, set);
}

export async function encodeAndSubmit(
  cfg: RuntimeConfig,
  item: ReviewItem,
  draft: FeedbackDraft,
): Promise<void> {
  const creatorId = cfg.creatorId ?? 'captain';

  if (cfg.mode === 'self_hosted' || cfg.mode === 'both') {
    if (!cfg.feedbackUrl) throw new Error('feedbackUrl is not configured for self-hosted mode');
    const key = 'self_hosted';
    if (!alreadyDone(item.id, key)) {
      const url = `${cfg.feedbackUrl.replace(/\/$/, '')}/${encodeURIComponent(item.id)}/feedback`;
      await postJson(url, encodePrdPayload(item, draft, creatorId), getAuthHeaders('self_hosted'));
      markDone(item.id, key);
    }
  }

  if (cfg.mode === 'coolhand' || cfg.mode === 'both') {
    const records = encodeCoolhandRecords(item, draft, creatorId);
    // Sequential fail-fast: on error, records already sent stay marked and the
    // retry picks up from the first unsent one.
    for (let i = 0; i < records.length; i++) {
      const key = `coolhand:${i}`;
      if (alreadyDone(item.id, key)) continue;
      await postJson(COOLHAND_FEEDBACK_URL, records[i], getAuthHeaders('coolhand'));
      markDone(item.id, key);
    }
  }

  completed.delete(item.id);
}
