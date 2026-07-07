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

/** Radio styled as a Basecoat button — selected = solid primary, rest = outline. */
function ChoiceChip({
  name,
  checked,
  onSelect,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: JSX.Element | string;
}): JSX.Element {
  return (
    <label
      class="btn has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
      data-variant={checked ? undefined : 'outline'}
      data-size="sm"
    >
      <input type="radio" name={name} class="sr-only" checked={checked} onChange={onSelect} />
      {children}
    </label>
  );
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
    <main class="mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-6">
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {theme.shipHeader}
      </p>
      <h1 class="mb-4 mt-1 text-3xl font-bold">Configure Session</h1>

      <section class="card mb-4" aria-labelledby="cfg-window">
        <header>
          <h2 id="cfg-window">Review window</h2>
        </header>
        <section>
          <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cfg-window">
            {(['4h', '24h', '7d', 'custom'] as const).map((choice) => (
              <ChoiceChip
                key={choice}
                name="window"
                checked={windowChoice === choice}
                onSelect={() => setWindowChoice(choice)}
              >
                {choice === 'custom'
                  ? 'Custom'
                  : `Last ${choice.replace('h', ' hours').replace('d', ' days')}`}
              </ChoiceChip>
            ))}
          </div>
          {windowChoice === 'custom' && (
            <div class="mt-3 flex flex-wrap gap-4">
              <label class="label gap-2">
                From{' '}
                <input
                  class="input"
                  type="datetime-local"
                  value={customStart}
                  onInput={(e) => setCustomStart(e.currentTarget.value)}
                />
              </label>
              <label class="label gap-2">
                To{' '}
                <input
                  class="input"
                  type="datetime-local"
                  value={customEnd}
                  onInput={(e) => setCustomEnd(e.currentTarget.value)}
                />
              </label>
            </div>
          )}
        </section>
      </section>

      <section class="card mb-4" aria-labelledby="cfg-target">
        <header>
          <h2 id="cfg-target">How long do you want to review today?</h2>
        </header>
        <section>
          <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cfg-target">
            {([20, 60, 120, 'custom'] as const).map((choice) => (
              <ChoiceChip
                key={choice}
                name="target"
                checked={targetChoice === choice}
                onSelect={() => setTargetChoice(choice)}
              >
                {choice === 'custom'
                  ? 'Custom'
                  : choice === 20
                    ? '20 min'
                    : `${choice / 60} hour${choice > 60 ? 's' : ''}`}
              </ChoiceChip>
            ))}
          </div>
          {targetChoice === 'custom' && (
            <label class="label mt-3 gap-2">
              Minutes{' '}
              <input
                class="input w-24"
                type="number"
                min={5}
                max={480}
                value={customMinutes}
                onInput={(e) => setCustomMinutes(Math.max(5, Number(e.currentTarget.value) || 5))}
              />
            </label>
          )}
        </section>
      </section>

      <section class="card mb-4" aria-labelledby="cfg-workloads">
        <header>
          <h2 id="cfg-workloads">Workloads</h2>
        </header>
        <section>
          {workloads.value.length === 0 ? (
            <p class="text-sm text-muted-foreground">No reviewable items in this window.</p>
          ) : !customizing ? (
            <>
              <ul class="mb-3">
                {workloads.value.map((w) => (
                  <li
                    key={w.id}
                    class="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0"
                  >
                    <span class="flex items-center gap-2">
                      {w.name}
                      {w.experimental && (
                        <span class="badge" data-variant="secondary">
                          experimental
                        </span>
                      )}
                    </span>
                    <span class="text-sm text-muted-foreground">{w.pending_count} pending</span>
                  </li>
                ))}
              </ul>
              <button
                class="btn"
                data-variant="ghost"
                data-size="sm"
                onClick={() => setCustomizing(true)}
              >
                Customize sampling…
              </button>
            </>
          ) : (
            <>
              <div class="mb-4 flex flex-wrap gap-2">
                <button
                  class="btn"
                  data-variant="outline"
                  data-size="sm"
                  onClick={() => setRates(presetEverything(workloads.value))}
                >
                  Everything
                </button>
                <button
                  class="btn"
                  data-variant="outline"
                  data-size="sm"
                  onClick={() => setRates(presetBalanced(workloads.value, targetMinutes))}
                >
                  Balance Across All
                </button>
                <button
                  class="btn"
                  data-variant="outline"
                  data-size="sm"
                  onClick={() => setRates(presetExperimental(workloads.value, targetMinutes))}
                >
                  Priority to Experimental
                </button>
              </div>
              {workloads.value.map((w) => (
                <RateSlider
                  key={w.id}
                  id={w.id}
                  label={w.name}
                  pendingCount={w.pending_count}
                  experimental={w.experimental}
                  rate={rates[w.id] ?? 1}
                  onChange={(rate) => setRates((prev) => ({ ...prev, [w.id]: rate }))}
                />
              ))}
              <label class="label my-3 gap-2 text-muted-foreground">
                <input
                  class="input"
                  type="checkbox"
                  checked={abSplit}
                  onChange={(e) => setAbSplit(e.currentTarget.checked)}
                />
                A/B split (tag items into two arms for head-to-head comparison)
              </label>
              <p class="font-semibold text-primary" aria-live="polite">
                At these settings you’ll review ~{projection.items} items (~{projection.minutes}{' '}
                min).
              </p>
            </>
          )}
        </section>
      </section>

      {error && (
        <p class="mb-3 font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <div class="flex items-center gap-4">
        {!customizing ? (
          <button
            class="btn"
            data-size="lg"
            disabled={starting || totalPending === 0}
            onClick={() => begin(presetEverything(workloads.value), quickStartCount)}
          >
            {starting ? 'Preparing…' : `Quick Start (~${quickStartCount} items)`}
          </button>
        ) : (
          <button
            class="btn"
            data-size="lg"
            disabled={starting || projection.items === 0}
            onClick={() => begin(rates)}
          >
            {starting ? 'Preparing…' : 'Start Session'}
          </button>
        )}
        <button class="btn" data-variant="ghost" onClick={() => navigate('landing')}>
          Back
        </button>
      </div>
    </main>
  );
}
