import { describe, it, expect, beforeEach, beforeAll, vi, type Mock } from 'vitest';
import { installFeedbackTransport } from './feedback-transport';
import { encodeAndSubmit, encodeCoolhandRecords, encodePrdPayload } from './feedback-encoder';
import { COOLHAND_FEEDBACK_URL } from '../config/constants';
import { runtimeConfig } from '../config/runtime-config';
import type { ReviewItem } from '../types/review';
import type { FeedbackDraft } from '../types/feedback';
import { queue, currentIndex, draftFor, resetSession } from '../state/session';

const item: ReviewItem = {
  id: 'item-1',
  workload_id: 'engineering-report-generation',
  workload_name: 'Engineering Report Generation',
  original_output: '# Hello world output',
  created_at: '2026-07-06T00:00:00Z',
};

let networkFetch: Mock;

beforeAll(() => {
  // Stub the "real network" BEFORE the transport captures its passthrough.
  networkFetch = vi.fn(async () => new Response('{"id":1}', { status: 200 }));
  window.fetch = networkFetch as unknown as typeof window.fetch;
  installFeedbackTransport();
});

beforeEach(() => {
  networkFetch.mockClear();
  resetSession();
  queue.value = [item];
  currentIndex.value = 0;
});

function widgetSend(
  body: Record<string, unknown>,
  method: 'POST' | 'PATCH' = 'POST',
  id?: number,
): Promise<Response> {
  const url = id !== undefined ? `${COOLHAND_FEEDBACK_URL}/${id}` : COOLHAND_FEEDBACK_URL;
  return window.fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ llm_request_log_feedback: body }),
  });
}

describe('feedback transport (capture-to-draft)', () => {
  it('never forwards widget feedback traffic to the network', async () => {
    const res = await widgetSend({ like: true, original_output: 'x' });
    expect(res.status).toBe(201);
    expect(networkFetch).not.toHaveBeenCalled();
  });

  it('passes unrelated URLs through untouched', async () => {
    await window.fetch('https://example.com/api');
    expect(networkFetch).toHaveBeenCalledTimes(1);
  });

  it('synthesizes a widget-compatible response with a stable id for PATCHes', async () => {
    const res = await widgetSend({ like: null, original_output: 'x' });
    const body = (await res.json()) as { id: number; like: null };
    expect(typeof body.id).toBe('number');
    expect(body.like).toBeNull();
    const patch = await widgetSend({ like: null, explanation: 'better' }, 'PATCH', body.id);
    expect(patch.status).toBe(200);
  });

  it('merges a partial create + PATCH sequence into one PartialDraft', async () => {
    const res = await widgetSend({
      like: false,
      original_output: item.original_output,
      focus_range: { start: 2, end: 7 },
      focus_section: 'Hello',
      partial_id: 'p-abc',
    });
    const { id } = (await res.json()) as { id: number };

    expect(draftFor(item.id).partials).toHaveLength(1);

    await widgetSend(
      { like: false, explanation: 'Needs a citation.', partial_id: 'p-abc' },
      'PATCH',
      id,
    );

    const partials = draftFor(item.id).partials;
    expect(partials).toHaveLength(1);
    expect(partials[0]).toMatchObject({
      localId: 'p-abc',
      focus_range: { start: 2, end: 7 },
      focus_section: 'Hello',
      sentiment: 'dislike',
      explanation: 'Needs a citation.',
    });
  });

  it('captures revised_output from main-widget traffic without inventing a sentiment', async () => {
    const res = await widgetSend({
      like: null,
      original_output: item.original_output,
      revised_output: '# Hello world output, edited',
    });
    const { id } = (await res.json()) as { id: number };
    await widgetSend({ like: null, revised_output: '# Final edit' }, 'PATCH', id);

    const draft = draftFor(item.id);
    expect(draft.revised_output).toBe('# Final edit');
    expect(draft.sentiment).toBeUndefined();
  });
});

describe('feedback encoder', () => {
  const draft: FeedbackDraft = {
    sentiment: 'like',
    revised_output: '# Edited',
    explanation: 'Solid overall.',
    partials: [
      {
        localId: 'p1',
        focus_range: { start: 2, end: 7 },
        focus_section: 'Hello',
        sentiment: 'dislike',
        explanation: 'Citation needed.',
      },
    ],
  };

  it('encodes the PRD §9.2 single-POST payload', () => {
    const payload = encodePrdPayload(item, draft, 'captain-jean-luc');
    expect(payload).toEqual({
      llm_request_log_id: 'item-1',
      creator_unique_id: 'captain-jean-luc',
      creator_type: 'human',
      sentiment: 'like',
      revised_output: '# Edited',
      explanation: 'Solid overall.',
      feedback_partials: [
        {
          focus_range: { start: 2, end: 7 },
          focus_section: 'Hello',
          sentiment: 'dislike',
          explanation: 'Citation needed.',
        },
      ],
    });
  });

  it("decomposes into today's Coolhand wire records: one main + one per partial", () => {
    const records = encodeCoolhandRecords(item, draft, 'captain');
    expect(records).toHaveLength(2);
    const [main, partial] = records.map((r) => r.llm_request_log_feedback);
    expect(main).toMatchObject({
      sentiment: 'like',
      revised_output: '# Edited',
      original_output: item.original_output,
      workload_hashid: item.workload_id,
      creator_unique_id: 'captain',
      creator_type: 'human',
    });
    expect(main.collector).toMatch(/^captainslog-/);
    // item.id is non-numeric → no exact-match field, fuzzy original_output instead.
    expect(main.llm_request_log_id).toBeUndefined();
    expect(partial).toMatchObject({
      sentiment: 'dislike',
      focus_range: { start: 2, end: 7 },
      focus_section: 'Hello',
      explanation: 'Citation needed.',
    });
  });

  it('skips the main record when the captain only annotated', () => {
    const records = encodeCoolhandRecords(item, { partials: draft.partials }, 'captain');
    expect(records).toHaveLength(1);
    expect(records[0].llm_request_log_feedback.focus_section).toBe('Hello');
  });

  it('both mode posts the PRD body to self-hosted and decomposed records to Coolhand', async () => {
    runtimeConfig.value = {
      ...runtimeConfig.value,
      mode: 'both',
      demo: false,
      feedbackUrl: 'https://backend.example.com/captain/review-queue',
      coolhandApiKey: 'test-key',
    };

    await encodeAndSubmit(runtimeConfig.value, item, draft);

    const calls = networkFetch.mock.calls as Array<[string, RequestInit]>;
    expect(calls).toHaveLength(3); // 1 self-hosted + 2 coolhand records
    expect(calls[0][0]).toBe('https://backend.example.com/captain/review-queue/item-1/feedback');
    const prdBody = JSON.parse(calls[0][1].body as string) as Record<string, unknown>;
    expect(prdBody.feedback_partials).toHaveLength(1);
    expect(calls[1][0]).toBe(COOLHAND_FEEDBACK_URL);
    expect((calls[1][1].headers as Record<string, string>)['X-API-Key']).toBe('test-key');
  });

  it('resumes idempotently after a mid-sequence failure', async () => {
    runtimeConfig.value = {
      ...runtimeConfig.value,
      mode: 'coolhand',
      demo: false,
      coolhandApiKey: 'test-key',
    };

    networkFetch
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('nope', { status: 500 }));

    await expect(encodeAndSubmit(runtimeConfig.value, item, draft)).rejects.toThrow(/500/);
    expect(networkFetch).toHaveBeenCalledTimes(2);

    networkFetch.mockClear();
    networkFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    await encodeAndSubmit(runtimeConfig.value, item, draft);
    // Only the failed record is retried — the first one is not duplicated.
    expect(networkFetch).toHaveBeenCalledTimes(1);
  });
});
