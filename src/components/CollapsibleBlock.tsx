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
    <div>
      <button
        class="btn px-0 text-science"
        data-variant="link"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span> {label}
      </button>
      {open && (
        <pre
          id={regionId}
          class="mb-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-4 font-mono text-[0.82rem]"
          tabindex={0}
        >
          {content}
        </pre>
      )}
    </div>
  );
}
