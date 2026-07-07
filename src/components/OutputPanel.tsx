import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ReviewItem } from '../types/review';
import { draftFor, updateDraft } from '../state/session';
import { renderMarkdown } from './MarkdownView';
import {
  attachAnnotate,
  attachEdit,
  detachAnnotate,
  detachEdit,
} from '../services/coolhand-adapter';

type PanelMode = 'annotate' | 'edit';

/** AI text visually delineated from UI chrome (PRD §7.3). */
const OUTPUT_SURFACE = 'rounded-lg border border-science/50 bg-card px-5 py-4';

/**
 * The AI output under review (PRD §7.3). Two mutually exclusive modes backed
 * by coolhand-js primitives (one element can't host both — see coolhand-adapter):
 *  - Annotate: rendered Markdown; select a span to attach sentiment + comment
 *    (partial feedback with focus_range/focus_section).
 *  - Edit: the raw Markdown in a textarea with debounced revised_output capture.
 */
export function OutputPanel({ item }: { item: ReviewItem }): JSX.Element {
  const [mode, setMode] = useState<PanelMode>('annotate');
  const annotateRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const draft = draftFor(item.id);
  const html = useMemo(() => renderMarkdown(item.original_output), [item.original_output]);

  useEffect(() => {
    if (mode === 'annotate') {
      const el = annotateRef.current;
      if (!el) return;
      attachAnnotate(el, item);
      return () => detachAnnotate(el, item);
    }
    const el = editRef.current;
    if (!el) return;
    attachEdit(el, item);
    return () => detachEdit(el);
    // `item` is stable per mount (parent keys this component by item.id).
  }, [mode, item.id]);

  return (
    <section class="mb-4" aria-label="AI output under review">
      <div class="mb-2 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Output mode" class="button-group">
          <button
            class="btn"
            data-variant={mode === 'annotate' ? undefined : 'outline'}
            data-size="sm"
            aria-pressed={mode === 'annotate'}
            onClick={() => setMode('annotate')}
          >
            Annotate
          </button>
          <button
            class="btn"
            data-variant={mode === 'edit' ? undefined : 'outline'}
            data-size="sm"
            aria-pressed={mode === 'edit'}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
        </div>
        <span class="text-sm text-muted-foreground">
          {mode === 'annotate'
            ? 'Select any passage to comment on it.'
            : 'Edit the output directly — changes are captured as your revision.'}
          {draft.revised_output !== undefined && draft.revised_output !== item.original_output && (
            <strong> · edited</strong>
          )}
        </span>
      </div>

      {mode === 'annotate' ? (
        <div
          ref={annotateRef}
          class={`prose prose-invert max-w-none ${OUTPUT_SURFACE}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <textarea
          ref={editRef}
          class={`textarea w-full resize-y font-mono text-sm ${OUTPUT_SURFACE}`}
          rows={16}
          value={draft.revised_output ?? item.original_output}
          onInput={(e) => updateDraft(item.id, { revised_output: e.currentTarget.value })}
          aria-label="Edit the AI output"
        />
      )}

      {draft.partials.length > 0 && (
        <p class="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {draft.partials.length} section annotation{draft.partials.length === 1 ? '' : 's'} on
          this item.
        </p>
      )}
    </section>
  );
}
