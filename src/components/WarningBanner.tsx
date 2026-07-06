import type { JSX } from 'preact';

/**
 * PRD §7.3 critical UX warning — shown at the point of submission. Feedback
 * improves future outputs; it does not modify the reviewed document or act on
 * any downstream system unless the operator wires up their own handler.
 */
export function WarningBanner(): JSX.Element {
  return (
    <p class="cl-warning-banner">
      Submitting sends your edits, annotations, and sentiment to your configured endpoint(s) to
      improve future prompts and evaluations. It does <strong>not</strong> modify the original
      document or act on the underlying system — until you wire up your own handler, captainslog
      only captures feedback.
    </p>
  );
}
