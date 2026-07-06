import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { installFeedbackTransport } from './feedback-transport';
import { attachEdit, detachEdit, ensureCoolhandInit } from './coolhand-adapter';
import type { ReviewItem } from '../types/review';
import { queue, currentIndex, draftFor, resetSession } from '../state/session';

/**
 * End-to-end: a REAL coolhand-js hidden widget on a textarea → debounced
 * revised_output submission → transport capture → session draft. This is the
 * PRD's "passive edit capture" primitive working against the actual SDK build.
 */

const item: ReviewItem = {
  id: 'edit-item',
  workload_id: 'captains-daily-brief',
  workload_name: "Captain's Daily Brief",
  original_output: 'Original briefing text.',
  created_at: '2026-07-06T00:00:00Z',
};

beforeAll(() => {
  window.fetch = vi.fn(async () => new Response('{}', { status: 200 }));
  installFeedbackTransport();
  ensureCoolhandInit();
});

beforeEach(() => {
  resetSession();
  queue.value = [item];
  currentIndex.value = 0;
  document.body.innerHTML = '';
});

describe('coolhand hidden edit widget → draft', () => {
  it('captures a debounced textarea edit as the draft revised_output', async () => {
    const textarea = document.createElement('textarea');
    textarea.value = item.original_output;
    document.body.appendChild(textarea);

    attachEdit(textarea, item);

    textarea.value = 'Original briefing text, tightened by the captain.';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // coolhand-js debounces edits at 1000ms.
    await vi.waitFor(
      () => {
        expect(draftFor(item.id).revised_output).toBe(
          'Original briefing text, tightened by the captain.',
        );
      },
      { timeout: 3000, interval: 100 },
    );

    // Edit capture must not fabricate an overall sentiment.
    expect(draftFor(item.id).sentiment).toBeUndefined();

    detachEdit(textarea);
  });
});
