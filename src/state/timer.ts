import { computed, signal } from '@preact/signals';

/**
 * Session time box. Elapsed time is computed from wall-clock deltas (not tick
 * counts) so background-tab throttling can't drift it; the 1 Hz tick only
 * refreshes the display. Snapshot persists to sessionStorage for refresh resilience.
 */

const STORAGE_KEY = 'captainslog.timer';

const targetMs = signal(0);
/** Milliseconds accumulated across completed (un-paused) run segments. */
const accumulatedMs = signal(0);
/** Wall-clock start of the current run segment; null while paused/stopped. */
const runStartedAt = signal<number | null>(null);
const nowTick = signal(Date.now());

let intervalId: ReturnType<typeof setInterval> | null = null;

export const elapsedMs = computed(
  () =>
    accumulatedMs.value +
    (runStartedAt.value !== null ? Math.max(0, nowTick.value - runStartedAt.value) : 0),
);
export const targetMinutes = computed(() => targetMs.value / 60_000);
export const isPaused = computed(() => targetMs.value > 0 && runStartedAt.value === null);
export const timeUp = computed(() => targetMs.value > 0 && elapsedMs.value >= targetMs.value);

function persist(): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        targetMs: targetMs.value,
        accumulatedMs: accumulatedMs.value,
        runStartedAt: runStartedAt.value,
      }),
    );
  } catch {
    // Storage unavailable (private mode) — timer still works in memory.
  }
}

function ensureTicking(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    nowTick.value = Date.now();
    persist();
  }, 1000);
}

export function startTimer(minutes: number): void {
  targetMs.value = Math.max(0, minutes) * 60_000;
  accumulatedMs.value = 0;
  runStartedAt.value = Date.now();
  nowTick.value = Date.now();
  ensureTicking();
  persist();
}

export function pauseTimer(): void {
  if (runStartedAt.value === null) return;
  accumulatedMs.value += Math.max(0, Date.now() - runStartedAt.value);
  runStartedAt.value = null;
  persist();
}

export function resumeTimer(): void {
  if (runStartedAt.value !== null || targetMs.value === 0) return;
  runStartedAt.value = Date.now();
  nowTick.value = Date.now();
  ensureTicking();
  persist();
}

/** Top up the target (used when continuing a session past the original box). */
export function extendTimer(minutes: number): void {
  targetMs.value += Math.max(0, minutes) * 60_000;
  persist();
}

export function stopTimer(): void {
  pauseTimer();
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
