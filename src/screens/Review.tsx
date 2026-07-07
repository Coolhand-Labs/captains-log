import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
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
import { WarningBanner } from '../components/WarningBanner';
import { OutputPanel } from '../components/OutputPanel';
import { showToast } from '../components/Toast';

const SENTIMENTS: Array<{ value: Sentiment; icon: string; label: string }> = [
  { value: 'like', icon: '👍', label: 'Good' },
  { value: 'neutral', icon: '😐', label: 'Neutral' },
  { value: 'dislike', icon: '👎', label: 'Bad' },
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

type ReferenceKind = 'prompt' | 'input';

/**
 * Prompt / input-data reference (PRD §7.3): hidden by default, each one click
 * away, opened in a side drawer so the output under review stays on screen.
 */
function ReferenceBlocks({ item }: { item: ReviewItem }): JSX.Element {
  const [reference, setReference] = useState<ReferenceKind | null>(null);
  return (
    <section class="my-3 flex gap-2" aria-label="Reference: what was this supposed to do?">
      {item.prompt !== undefined && (
        <button
          class="btn text-science"
          data-variant="outline"
          data-size="sm"
          onClick={() => setReference('prompt')}
        >
          View Prompt
        </button>
      )}
      {item.input_data !== undefined && (
        <button
          class="btn text-science"
          data-variant="outline"
          data-size="sm"
          onClick={() => setReference('input')}
        >
          View Input Data
        </button>
      )}
      {reference !== null && (
        <ReferenceDrawer item={item} initial={reference} onClose={() => setReference(null)} />
      )}
    </section>
  );
}

function ReferenceDrawer({
  item,
  initial,
  onClose,
}: {
  item: ReviewItem;
  initial: ReferenceKind;
  onClose: () => void;
}): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<ReferenceKind>(initial);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onClose]);

  const hasBoth = item.prompt !== undefined && item.input_data !== undefined;
  const content =
    kind === 'prompt' ? (item.prompt ?? '') : JSON.stringify(item.input_data, null, 2);

  return (
    <dialog
      ref={dialogRef}
      class="drawer"
      data-side="right"
      aria-labelledby="cl-ref-title"
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <article>
        <header>
          <h2 id="cl-ref-title">Reference</h2>
          <p>What was this output supposed to do? Reference only — not what you’re judging.</p>
        </header>
        <section class="overflow-y-auto px-4">
          {hasBoth && (
            <div role="group" aria-label="Reference content" class="button-group mb-3">
              <button
                class="btn"
                data-size="sm"
                data-variant={kind === 'prompt' ? undefined : 'outline'}
                aria-pressed={kind === 'prompt'}
                onClick={() => setKind('prompt')}
              >
                Prompt
              </button>
              <button
                class="btn"
                data-size="sm"
                data-variant={kind === 'input' ? undefined : 'outline'}
                aria-pressed={kind === 'input'}
                onClick={() => setKind('input')}
              >
                Input Data
              </button>
            </div>
          )}
          <pre
            class="whitespace-pre-wrap rounded-md border border-border bg-muted p-4 font-mono text-[0.82rem]"
            tabindex={0}
          >
            {content}
          </pre>
        </section>
        <footer>
          <button class="btn" data-variant="outline" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </footer>
      </article>
    </dialog>
  );
}
