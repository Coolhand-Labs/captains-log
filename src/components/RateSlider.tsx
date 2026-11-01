import type { JSX } from 'preact';
import type { WorkloadMaturity } from '../types/review';

interface Props {
  id: string;
  label: string;
  pendingCount: number;
  maturity?: WorkloadMaturity | null;
  /** 0–1 */
  rate: number;
  onChange: (rate: number) => void;
}

export function RateSlider({
  id,
  label,
  pendingCount,
  maturity,
  rate,
  onChange,
}: Props): JSX.Element {
  const pct = Math.round(rate * 100);
  const sliderId = `rate-${id}`;
  return (
    <div class="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-1.5">
      <label for={sliderId} class="label flex-col items-start gap-0.5">
        <span class="flex items-center gap-2">
          {label}
          {maturity && (
            <span class="badge" data-variant="secondary">
              {maturity}
            </span>
          )}
        </span>
        <span class="text-xs font-normal text-muted-foreground">{pendingCount} pending</span>
      </label>
      <input
        id={sliderId}
        class="input w-40"
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        aria-valuetext={`${pct}% of ${label}`}
        onInput={(e) => onChange(Number(e.currentTarget.value) / 100)}
      />
      <output class="w-10 text-right font-mono text-sm text-muted-foreground" aria-hidden="true">
        {pct}%
      </output>
    </div>
  );
}
