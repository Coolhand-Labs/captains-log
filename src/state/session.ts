import { computed, signal } from '@preact/signals';
import type { ReviewItem, ReviewQueueProvider, WorkloadSummary } from '../types/review';
import type { FeedbackDraft, PartialDraft } from '../types/feedback';
import { likeToSentiment } from '../types/feedback';
import type { SessionConfig, SkipRecord, SubmissionRecord } from '../types/session';
import {
  setFeedbackCaptureHandler,
  type CapturedFeedback,
} from '../services/feedback-transport';
import { createDemoProvider } from '../services/demo/demo-provider';
import { mulberry32, samplePlan } from '../services/sampling';
import { runtimeConfig } from '../config/runtime-config';
import { submitDraft } from '../services/api-client';
import { startTimer, stopTimer, timeUp } from './timer';

/** Active backend seam — demo provider or HTTP client, chosen at auth time. */
export const provider = signal<ReviewQueueProvider | null>(null);
export const workloads = signal<WorkloadSummary[]>([]);
export const sessionConfig = signal<SessionConfig | null>(null);

export const queue = signal<ReviewItem[]>([]);
export const currentIndex = signal(0);
export const drafts = signal<ReadonlyMap<string, FeedbackDraft>>(new Map());
export const submissions = signal<SubmissionRecord[]>([]);
export const skips = signal<SkipRecord[]>([]);

export const currentItem = computed<ReviewItem | null>(
  () => queue.value[currentIndex.value] ?? null,
);
export const reviewedItemIds = computed<ReadonlySet<string>>(
  () => new Set(submissions.value.map((s) => s.itemId)),
);

const EMPTY_DRAFT: FeedbackDraft = { partials: [] };

export function draftFor(itemId: string): FeedbackDraft {
  return drafts.value.get(itemId) ?? EMPTY_DRAFT;
}

export function updateDraft(itemId: string, patch: Partial<FeedbackDraft>): void {
  const next = new Map(drafts.value);
  next.set(itemId, { ...EMPTY_DRAFT, ...next.get(itemId), ...patch });
  drafts.value = next;
}

export function discardDraft(itemId: string): void {
  if (!drafts.value.has(itemId)) return;
  const next = new Map(drafts.value);
  next.delete(itemId);
  drafts.value = next;
}

/** A/B arm per item when the session was started with an A/B split. */
export const arms = signal<ReadonlyMap<string, 'A' | 'B'>>(new Map());

export function startDemo(): void {
  provider.value = createDemoProvider();
  resetSession();
}

export function creatorUniqueId(): string {
  return runtimeConfig.value.creatorId ?? 'demo-captain';
}

/**
 * Build the session queue (PRD §7.2 Start): fetch the full window from the
 * provider (all pages), apply the captain's sampling client-side, shuffle,
 * optionally cap to the time box (Quick Start), and start the clock.
 */
export async function startSession(
  config: SessionConfig,
  opts: { cap?: number; seed?: number } = {},
): Promise<void> {
  const p = provider.value;
  if (!p) throw new Error('No review-queue provider configured');

  const items: ReviewItem[] = [];
  let offset: number | undefined = 0;
  do {
    const page = await p.fetchQueue({
      time_window_start: config.windowStart,
      time_window_end: config.windowEnd,
      creator_unique_id: creatorUniqueId(),
      exclude_reviewed_by_creator: true,
      limit: 200,
      offset,
    });
    items.push(...page.items);
    offset = page.has_more ? page.next_offset : undefined;
  } while (offset !== undefined);

  const rand = mulberry32(opts.seed ?? Date.now());
  const plan = samplePlan(items, config.rates, rand, opts.cap);

  sessionConfig.value = config;
  queue.value = plan;
  currentIndex.value = 0;
  drafts.value = new Map();
  submissions.value = [];
  skips.value = [];
  partialRoutes.clear();
  mainRoutes.clear();
  arms.value = config.abSplit
    ? new Map(plan.map((item, i) => [item.id, i % 2 === 0 ? ('A' as const) : ('B' as const)]))
    : new Map();

  startTimer(config.targetMinutes);
}

export function resetSession(): void {
  queue.value = [];
  currentIndex.value = 0;
  drafts.value = new Map();
  submissions.value = [];
  skips.value = [];
  partialRoutes.clear();
  mainRoutes.clear();
}

export type AdvanceResult = 'advanced' | 'session-complete';

/**
 * The time box is soft (PRD §7.5): time-up never interrupts mid-item, it ends
 * the session at the next submit/skip boundary. Queue exhaustion ends immediately.
 */
function advance(): AdvanceResult {
  if (timeUp.value || currentIndex.value + 1 >= queue.value.length) {
    stopTimer();
    return 'session-complete';
  }
  currentIndex.value += 1;
  return 'advanced';
}

/**
 * Submit & Next: POSTs the full package (edits, partials, sentiment,
 * explanation). Throws on submission failure so the screen shows inline
 * error + retry and never advances past an unsaved item (PRD §7.3).
 */
export async function submitCurrentItem(): Promise<AdvanceResult> {
  const item = currentItem.value;
  if (!item) return 'session-complete';
  const draft = draftFor(item.id);
  await submitDraft(item, draft);
  submissions.value = [
    ...submissions.value,
    {
      itemId: item.id,
      workloadId: item.workload_id,
      submittedAt: new Date().toISOString(),
      draft,
      arm: arms.value.get(item.id),
    },
  ];
  return advance();
}

/** Skip: logged, nothing submitted, item not marked reviewed (PRD §7.3). */
export function skipCurrentItem(): AdvanceResult {
  const item = currentItem.value;
  if (!item) return 'session-complete';
  skips.value = [...skips.value, { itemId: item.id, skippedAt: new Date().toISOString() }];
  discardDraft(item.id);
  return advance();
}

/* ------------------------------------------------------------------------ *
 * Widget-capture routing (see services/feedback-transport.ts).
 *
 * Captured coolhand-js traffic merges into the current item's draft:
 *  - records carrying focus_range/focus_section/partial_id are section
 *    annotations → PartialDraft, including their own sentiment (from `like`);
 *  - records without focus fields come from the hidden edit-capture widget →
 *    only revised_output/explanation are taken. Overall sentiment is owned by
 *    captainslog's native buttons and never inferred from main-widget traffic
 *    (the widget's `like` defaults to null, which would read as "neutral").
 * ------------------------------------------------------------------------ */

/** transport feedbackId → partial annotation location, for PATCH routing. */
const partialRoutes = new Map<number, { itemId: string; localId: string }>();
/** transport feedbackId → item whose main (edit/explanation) record it is. */
const mainRoutes = new Map<number, string>();

function isPartialPayload(p: CapturedFeedback['payload']): boolean {
  return p.focus_range !== undefined || p.focus_section !== undefined || p.partial_id !== undefined;
}

function mergePartial(itemId: string, localId: string, captured: CapturedFeedback): void {
  const draft = draftFor(itemId);
  const existing = draft.partials.find((p) => p.localId === localId);
  const p = captured.payload;
  const merged: PartialDraft = {
    localId,
    feedbackId: captured.feedbackId,
    focus_range: p.focus_range ?? existing?.focus_range,
    focus_section: p.focus_section ?? existing?.focus_section,
    sentiment: p.like !== undefined ? likeToSentiment(p.like) : (existing?.sentiment ?? 'neutral'),
    explanation: p.explanation ?? existing?.explanation,
  };
  updateDraft(itemId, {
    partials: [...draft.partials.filter((x) => x.localId !== localId), merged],
  });
}

function handleCapture(captured: CapturedFeedback): void {
  const { kind, feedbackId, payload } = captured;

  if (kind === 'update') {
    const partialRoute = partialRoutes.get(feedbackId);
    if (partialRoute) {
      mergePartial(partialRoute.itemId, partialRoute.localId, captured);
      return;
    }
    const mainItemId = mainRoutes.get(feedbackId);
    if (mainItemId) {
      updateDraft(mainItemId, {
        ...(payload.revised_output !== undefined && { revised_output: payload.revised_output }),
        ...(payload.explanation !== undefined && { explanation: payload.explanation }),
      });
    }
    return;
  }

  const item = currentItem.value;
  if (!item) return;

  if (isPartialPayload(payload)) {
    const localId = payload.partial_id ?? `partial-${feedbackId}`;
    partialRoutes.set(feedbackId, { itemId: item.id, localId });
    mergePartial(item.id, localId, captured);
    return;
  }

  mainRoutes.set(feedbackId, item.id);
  updateDraft(item.id, {
    ...(payload.revised_output !== undefined && { revised_output: payload.revised_output }),
    ...(payload.explanation !== undefined && { explanation: payload.explanation }),
  });
}

setFeedbackCaptureHandler(handleCapture);
