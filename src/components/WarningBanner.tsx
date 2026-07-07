import type { JSX } from 'preact';

/**
 * PRD §7.3 critical UX warning — shown at the point of submission. Feedback
 * improves future outputs; it does not modify the reviewed document or act on
 * any downstream system unless the operator wires up their own handler.
 */
export function WarningBanner(): JSX.Element {
  return (
    <div class="alert my-4">
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <h2>Feedback improves the process — it doesn’t edit the document</h2>
      <section>
        Submitting sends your edits, annotations, and sentiment to your configured endpoint(s) to
        improve future prompts and evaluations. It does <strong>not</strong> modify the original
        document or act on the underlying system — until you wire up your own handler, captainslog
        only captures feedback.
      </section>
    </div>
  );
}
