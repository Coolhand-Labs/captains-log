import type { JSX } from 'preact';
import { useId, useState } from 'preact/hooks';

interface Props {
  label: string;
  content: string;
}

/**
 * Prompt / input-data reference blocks (PRD §7.3): hidden by default, each
 * independently toggleable, read-only monospace. Reference only — not judged.
 */
export function CollapsibleBlock({ label, content }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  return (
    <div class="cl-collapsible">
      <button
        class="cl-btn-ghost cl-collapsible-toggle"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span> {label}
      </button>
      {open && (
        <pre id={regionId} class="cl-collapsible-body" tabindex={0}>
          {content}
        </pre>
      )}
    </div>
  );
}
