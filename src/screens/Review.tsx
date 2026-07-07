import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Theme } from '../theme/theme';
import type { ReviewItem } from '../types/review';
import type { Sentiment } from '../types/feedback';
import { navigate } from '../router';
import {
  currentIndex,
  currentItem,
  draftFor,
  queue,
  skipCurrentItem,
  submitCurrentItem,
  submissions,
  skips,
  updateDraft,
  type AdvanceResult,
} from '../state/session';
import { isPaused, resumeTimer } from '../state/timer';
import { SessionHeader } from '../components/SessionHeader';
import { CollapsibleBlock } from '../components/CollapsibleBlock';
import { WarningBanner } from '../components/WarningBanner';
import { OutputPanel } from '../components/OutputPanel';
import { showToast } from '../components/Toast';

const SENTIMENTS: Array<{ value: Sentiment; icon: string; label: string }> = [
  { value: 'like', icon: '👍', label: 'Like' },
  { value: 'neutral', icon: '😐', label: 'Neutral' },
  { value: 'dislike', icon: '👎', label: 'Dislike' },
];

const EXPLANATION_PLACEHOLDER: Record<Sentiment | 'none', string> = {
  like: 'What makes this one good?',
  neutral: 'What would nudge this from fine to good?',
  dislike: 'What should change here?',
  none: 'Anything the process should learn from this output? (optional)',
};

export function Review({ theme }: { theme: Theme }): JSX.Element | null {
  const item = currentItem.value;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      navigate(submissions.value.length || skips.value.length ? 'reward' : 'landing');
    }
  }, [item]);

  if (!item) return null;

  const draft = draftFor(item.id);

  const finish = (result: AdvanceResult) => {
    if (result === 'session-complete') navigate('reward');
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitCurrentItem();
      showToast(theme.submittedToast);
      finish(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Submission failed — your feedback is still here. Retry.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main class="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-6">
      <SessionHeader
        theme={theme}
        workloadName={item.workload_name}
        createdAt={item.created_at}
        position={currentIndex.value + 1}
        total={queue.value.length}
      />

      {isPaused.value && (
        <div class="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/85 text-lg">
          <p>Session paused.</p>
          <button class="btn" onClick={resumeTimer}>
            ▶ Resume
          </button>
        </div>
      )}

      <div class={isPaused.value ? 'pointer-events-none select-none blur-[2px]' : ''}>
        {/* Remount per item so widget attachments and fades reset cleanly. */}
        <OutputPanel key={item.id} item={item} />

        <ReferenceBlocks item={item} />

        <section class="my-4" aria-label="Your feedback">
          <div role="radiogroup" aria-label="Overall sentiment" class="mb-3 flex gap-2">
            {SENTIMENTS.map((s) => (
              <button
                key={s.value}
                role="radio"
                aria-checked={draft.sentiment === s.value}
                class="btn"
                data-variant={draft.sentiment === s.value ? undefined : 'outline'}
                onClick={() =>
                  updateDraft(item.id, {
                    sentiment: draft.sentiment === s.value ? undefined : s.value,
                  })
                }
              >
                <span aria-hidden="true">{s.icon}</span> {s.label}
              </button>
            ))}
          </div>

          <label class="label w-full flex-col items-start gap-1.5">
            <span>
              Explanation <span class="font-normal text-muted-foreground">(optional)</span>
            </span>
            <textarea
              class="textarea w-full"
              rows={3}
              value={draft.explanation ?? ''}
              placeholder={EXPLANATION_PLACEHOLDER[draft.sentiment ?? 'none']}
              onInput={(e) => updateDraft(item.id, { explanation: e.currentTarget.value })}
            />
          </label>
        </section>

        <WarningBanner />

        {error && (
          <p class="font-medium text-destructive" role="alert">
            {error}
          </p>
        )}

        <div class="mt-4 flex items-center gap-3">
          <button class="btn" data-size="lg" disabled={submitting} onClick={onSubmit}>
            {submitting ? 'Submitting…' : error ? 'Retry Submit' : 'Submit & Next'}
          </button>
          <button
            class="btn"
            data-variant="ghost"
            disabled={submitting}
            onClick={() => finish(skipCurrentItem())}
          >
            Skip
          </button>
        </div>
      </div>
    </main>
  );
}

function ReferenceBlocks({ item }: { item: ReviewItem }): JSX.Element {
  return (
    <section class="my-3" aria-label="Reference: what was this supposed to do?">
      {item.prompt !== undefined && <CollapsibleBlock label="View Prompt" content={item.prompt} />}
      {item.input_data !== undefined && (
        <CollapsibleBlock
          label="View Input Data"
          content={JSON.stringify(item.input_data, null, 2)}
        />
      )}
    </section>
  );
}
