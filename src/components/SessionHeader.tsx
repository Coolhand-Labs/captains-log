import type { JSX } from 'preact';
import type { Theme } from '../theme/theme';
import {
  elapsedMs,
  formatClock,
  isPaused,
  pauseTimer,
  resumeTimer,
  targetMinutes,
  timeUp,
} from '../state/timer';

interface Props {
  theme: Theme;
  workloadName: string;
  createdAt: string;
  position: number;
  total: number;
}

export function SessionHeader({
  theme,
  workloadName,
  createdAt,
  position,
  total,
}: Props): JSX.Element {
  const pct = total === 0 ? 0 : Math.round((position / total) * 100);
  const created = new Date(createdAt);
  return (
    <header class="mb-4 border-b border-border pb-3">
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="btn"
          data-variant="ghost"
          data-size="sm"
          onClick={() => (isPaused.value ? resumeTimer() : pauseTimer())}
          aria-pressed={isPaused.value}
        >
          {isPaused.value ? '▶ Resume' : '⏸ Pause'}
        </button>
        <span class="font-bold text-science">{workloadName}</span>
        <time dateTime={createdAt} class="text-xs text-muted-foreground">
          {created.toLocaleString()}
        </time>
      </div>
      <div class="mt-2 flex items-center gap-3 text-sm">
        <span>
          {position} of {total}
        </span>
        <div
          class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={position}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Session progress"
        >
          <div
            class="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span class={`font-mono ${timeUp.value ? 'font-bold text-destructive' : ''}`}>
          {formatClock(elapsedMs.value)} / {targetMinutes.value} min
        </span>
      </div>
      {timeUp.value && (
        <p class="mt-2 font-medium text-destructive" role="status">
          {theme.timeUpMessage}
        </p>
      )}
    </header>
  );
}
