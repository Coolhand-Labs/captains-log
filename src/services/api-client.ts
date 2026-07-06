import { runtimeConfig } from '../config/runtime-config';
import type {
  ReviewItem,
  ReviewQueueProvider,
  ReviewQueueQuery,
  ReviewQueueResponse,
  WorkloadSummary,
} from '../types/review';
import type { FeedbackDraft } from '../types/feedback';
import { sanitizeItems } from './sanitize';
import { getAuthHeaders } from './auth/auth';

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

function queueAuthHeaders(): Record<string, string> {
  return getAuthHeaders(runtimeConfig.value.mode === 'coolhand' ? 'coolhand' : 'self_hosted');
}

/**
 * HTTP ReviewQueueProvider speaking the PRD §9.1 contract
 * (`GET /captain/review-queue`, plus `/workloads` for the sampling UI — see
 * docs/coolhand-issues/01 and /05). Used for coolhand, self_hosted, and both.
 */
export function createHttpProvider(): ReviewQueueProvider {
  const base = () => runtimeConfig.value.reviewQueueUrl.replace(/\/$/, '');

  async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...queueAuthHeaders() },
    });
    if (!res.ok) throw new Error(`Review-queue request failed (${res.status}) at ${url}`);
    return (await res.json()) as T;
  }

  async function fetchQueue(query: ReviewQueueQuery): Promise<ReviewQueueResponse> {
    const params = new URLSearchParams();
    params.set('time_window_start', query.time_window_start);
    params.set('time_window_end', query.time_window_end);
    if (query.creator_unique_id) params.set('creator_unique_id', query.creator_unique_id);
    if (query.exclude_reviewed_by_creator) params.set('exclude_reviewed_by_creator', 'true');
    for (const w of query.workloads ?? []) params.append('workloads[]', w);
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    if (query.offset !== undefined) params.set('offset', String(query.offset));

    const raw = await getJson<{
      items: Array<Record<string, unknown>>;
      total_count: number;
      has_more: boolean;
      next_offset?: number;
    }>(`${base()}?${params}`);

    return {
      // Whitelist sanitization + client-side dedup, whether or not the backend pre-filters.
      items: sanitizeItems(raw.items ?? []),
      total_count: raw.total_count ?? 0,
      has_more: raw.has_more ?? false,
      next_offset: raw.next_offset,
    };
  }

  return {
    fetchQueue,

    async listWorkloads(window): Promise<WorkloadSummary[]> {
      const params = new URLSearchParams({
        time_window_start: window.start,
        time_window_end: window.end,
      });
      try {
        return await getJson<WorkloadSummary[]>(`${base()}/workloads?${params}`);
      } catch {
        // Backend without the workloads endpoint: derive names/counts from the
        // first queue pages instead (bounded, best-effort).
        const counts = new Map<string, WorkloadSummary>();
        let offset: number | undefined = 0;
        for (let page = 0; page < 5 && offset !== undefined; page++) {
          const res: ReviewQueueResponse = await fetchQueue({
            time_window_start: window.start,
            time_window_end: window.end,
            exclude_reviewed_by_creator: true,
            limit: 200,
            offset,
          });
          for (const item of res.items) {
            const existing = counts.get(item.workload_id);
            if (existing) existing.pending_count += 1;
            else
              counts.set(item.workload_id, {
                id: item.workload_id,
                name: item.workload_name,
                pending_count: 1,
              });
          }
          offset = res.has_more ? res.next_offset : undefined;
        }
        return [...counts.values()];
      }
    },
  };
}
