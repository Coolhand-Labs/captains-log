import type { JSX } from 'preact';

interface Props {
  id: string;
  label: string;
  pendingCount: number;
  experimental?: boolean;
  /** 0–1 */
  rate: number;
  onChange: (rate: number) => void;
}

export function RateSlider({
  id,
  label,
  pendingCount,
  experimental,
  rate,
  onChange,
}: Props): JSX.Element {
  const pct = Math.round(rate * 100);
  const sliderId = `rate-${id}`;
  return (
    <div class="cl-rate-row">
      <label for={sliderId} class="cl-rate-label">
        <span class="cl-rate-name">
          {label}
          {experimental && <span class="cl-badge">experimental</span>}
        </span>
        <span class="cl-rate-pending">{pendingCount} pending</span>
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        aria-valuetext={`${pct}% of ${label}`}
        onInput={(e) => onChange(Number(e.currentTarget.value) / 100)}
      />
      <span class="cl-rate-pct" aria-hidden="true">
        {pct}%
      </span>
    </div>
  );
}
