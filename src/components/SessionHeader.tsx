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
    <header class={`cl-session-header ${timeUp.value ? 'cl-time-up' : ''}`}>
      <div class="cl-session-meta">
        <button
          class="cl-btn-ghost"
          onClick={() => (isPaused.value ? resumeTimer() : pauseTimer())}
          aria-pressed={isPaused.value}
        >
          {isPaused.value ? '▶ Resume' : '⏸ Pause'}
        </button>
        <span class="cl-workload-label">{workloadName}</span>
        <time dateTime={createdAt} class="cl-created-at">
          {created.toLocaleString()}
        </time>
      </div>
      <div class="cl-session-progress">
        <span>
          {position} of {total}
        </span>
        <div
          class="cl-progress-bar"
          role="progressbar"
          aria-valuenow={position}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Session progress"
        >
          <div class="cl-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span class={`cl-clock ${timeUp.value ? 'cl-clock-over' : ''}`}>
          {formatClock(elapsedMs.value)} / {targetMinutes.value} min
        </span>
      </div>
      {timeUp.value && (
        <p class="cl-time-up-banner" role="status">
          {theme.timeUpMessage}
        </p>
      )}
    </header>
  );
}
