import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Theme } from '../theme/theme';
import { navigate } from '../router';
import { provider, workloads, startSession } from '../state/session';
import {
  presetBalanced,
  presetEverything,
  presetExperimental,
  projectSelection,
  type SamplingRates,
} from '../services/sampling';
import { EST_MIN_PER_ITEM } from '../config/constants';
import { RateSlider } from '../components/RateSlider';

type WindowChoice = '4h' | '24h' | '7d' | 'custom';
type TargetChoice = 20 | 60 | 120 | 'custom';

const WINDOW_HOURS: Record<Exclude<WindowChoice, 'custom'>, number> = {
  '4h': 4,
  '24h': 24,
  '7d': 168,
};

function windowBounds(
  choice: WindowChoice,
  customStart: string,
  customEnd: string,
): { start: string; end: string } {
  if (choice === 'custom' && customStart && customEnd) {
    return {
      start: new Date(customStart).toISOString(),
      end: new Date(customEnd).toISOString(),
    };
  }
  const hours = choice === 'custom' ? 24 : WINDOW_HOURS[choice];
  const end = Date.now();
  return {
    start: new Date(end - hours * 3_600_000).toISOString(),
    end: new Date(end).toISOString(),
  };
}

export function Configure({ theme }: { theme: Theme }): JSX.Element {
  const [windowChoice, setWindowChoice] = useState<WindowChoice>('24h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [targetChoice, setTargetChoice] = useState<TargetChoice>(60);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [customizing, setCustomizing] = useState(false);
  const [rates, setRates] = useState<SamplingRates>({});
  const [abSplit, setAbSplit] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetMinutes = targetChoice === 'custom' ? customMinutes : targetChoice;
  const bounds = useMemo(
    () => windowBounds(windowChoice, customStart, customEnd),
    [windowChoice, customStart, customEnd],
  );

  // No provider means the user landed here directly (e.g. page refresh).
  useEffect(() => {
    if (!provider.value) navigate('landing');
  }, []);

  // Reload workload pending counts whenever the review window changes.
  useEffect(() => {
    const p = provider.value;
    if (!p) return;
    let cancelled = false;
    p.listWorkloads(bounds).then((result) => {
      if (cancelled) return;
      workloads.value = result;
      setRates((prev) => (Object.keys(prev).length ? prev : presetEverything(result)));
    });
    return () => {
      cancelled = true;
    };
  }, [bounds]);

  const projection = projectSelection(workloads.value, rates);
  const totalPending = workloads.value.reduce((sum, w) => sum + w.pending_count, 0);
  const quickStartCount = Math.min(totalPending, Math.ceil(targetMinutes / EST_MIN_PER_ITEM));

  async function begin(sessionRates: SamplingRates, cap?: number): Promise<void> {
    setStarting(true);
    setError(null);
    try {
      await startSession(
        {
          windowStart: bounds.start,
          windowEnd: bounds.end,
          targetMinutes,
          rates: sessionRates,
          abSplit,
        },
        { cap },
      );
      navigate('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start the session.');
      setStarting(false);
    }
  }

  return (
    <main class="cl-screen">
      <p class="cl-ship-header">{theme.shipHeader}</p>
      <h1>Configure Session</h1>

      <section class="cl-card cl-config-section" aria-labelledby="cfg-window">
        <h2 id="cfg-window">Review window</h2>
        <div class="cl-choice-row" role="radiogroup" aria-labelledby="cfg-window">
          {(['4h', '24h', '7d', 'custom'] as const).map((choice) => (
            <label key={choice} class={`cl-chip ${windowChoice === choice ? 'cl-chip-active' : ''}`}>
              <input
                type="radio"
                name="window"
                checked={windowChoice === choice}
                onChange={() => setWindowChoice(choice)}
              />
              {choice === 'custom' ? 'Custom' : `Last ${choice.replace('h', ' hours').replace('d', ' days')}`}
            </label>
          ))}
        </div>
        {windowChoice === 'custom' && (
          <div class="cl-custom-window">
            <label>
              From{' '}
              <input
                type="datetime-local"
                value={customStart}
                onInput={(e) => setCustomStart(e.currentTarget.value)}
              />
            </label>
            <label>
              To{' '}
              <input
                type="datetime-local"
                value={customEnd}
                onInput={(e) => setCustomEnd(e.currentTarget.value)}
              />
            </label>
          </div>
        )}
      </section>

      <section class="cl-card cl-config-section" aria-labelledby="cfg-target">
        <h2 id="cfg-target">How long do you want to review today?</h2>
        <div class="cl-choice-row" role="radiogroup" aria-labelledby="cfg-target">
          {([20, 60, 120, 'custom'] as const).map((choice) => (
            <label key={choice} class={`cl-chip ${targetChoice === choice ? 'cl-chip-active' : ''}`}>
              <input
                type="radio"
                name="target"
                checked={targetChoice === choice}
                onChange={() => setTargetChoice(choice)}
              />
              {choice === 'custom' ? 'Custom' : choice === 20 ? '20 min' : `${choice / 60} hour${choice > 60 ? 's' : ''}`}
            </label>
          ))}
        </div>
        {targetChoice === 'custom' && (
          <label class="cl-custom-minutes">
            Minutes{' '}
            <input
              type="number"
              min={5}
              max={480}
              value={customMinutes}
              onInput={(e) => setCustomMinutes(Math.max(5, Number(e.currentTarget.value) || 5))}
            />
          </label>
        )}
      </section>

      <section class="cl-card cl-config-section" aria-labelledby="cfg-workloads">
        <h2 id="cfg-workloads">Workloads</h2>
        {workloads.value.length === 0 ? (
          <p class="cl-hint">No reviewable items in this window.</p>
        ) : !customizing ? (
          <>
            <ul class="cl-workload-list">
              {workloads.value.map((w) => (
                <li key={w.id}>
                  <span>
                    {w.name}
                    {w.experimental && <span class="cl-badge">experimental</span>}
                  </span>
                  <span class="cl-rate-pending">{w.pending_count} pending</span>
                </li>
              ))}
            </ul>
            <button class="cl-btn-ghost" onClick={() => setCustomizing(true)}>
              Customize sampling…
            </button>
          </>
        ) : (
          <>
            <div class="cl-preset-row">
              <button onClick={() => setRates(presetEverything(workloads.value))}>Everything</button>
              <button onClick={() => setRates(presetBalanced(workloads.value, targetMinutes))}>
                Balance Across All
              </button>
              <button onClick={() => setRates(presetExperimental(workloads.value, targetMinutes))}>
                Priority to Experimental
              </button>
            </div>
            {workloads.value.map((w) => (
              <RateSliderRow key={w.id} workloadId={w.id} rates={rates} setRates={setRates} />
            ))}
            <label class="cl-ab-toggle">
              <input
                type="checkbox"
                checked={abSplit}
                onChange={(e) => setAbSplit(e.currentTarget.checked)}
              />{' '}
              A/B split (tag items into two arms for head-to-head comparison)
            </label>
            <p class="cl-projection" aria-live="polite">
              At these settings you’ll review ~{projection.items} items (~{projection.minutes} min).
            </p>
          </>
        )}
      </section>

      {error && (
        <p class="cl-error" role="alert">
          {error}
        </p>
      )}

      <div class="cl-config-actions">
        {!customizing ? (
          <button
            class="cl-btn-primary cl-cta"
            disabled={starting || totalPending === 0}
            onClick={() => begin(presetEverything(workloads.value), quickStartCount)}
          >
            {starting ? 'Preparing…' : `Quick Start (~${quickStartCount} items)`}
          </button>
        ) : (
          <button
            class="cl-btn-primary cl-cta"
            disabled={starting || projection.items === 0}
            onClick={() => begin(rates)}
          >
            {starting ? 'Preparing…' : 'Start Session'}
          </button>
        )}
        <button class="cl-btn-ghost" onClick={() => navigate('landing')}>
          Back
        </button>
      </div>
    </main>
  );
}

function RateSliderRow({
  workloadId,
  rates,
  setRates,
}: {
  workloadId: string;
  rates: SamplingRates;
  setRates: (fn: (prev: SamplingRates) => SamplingRates) => void;
}): JSX.Element | null {
  const w = workloads.value.find((x) => x.id === workloadId);
  if (!w) return null;
  return (
    <RateSlider
      id={w.id}
      label={w.name}
      pendingCount={w.pending_count}
      experimental={w.experimental}
      rate={rates[w.id] ?? 1}
      onChange={(rate) => setRates((prev) => ({ ...prev, [w.id]: rate }))}
    />
  );
}
