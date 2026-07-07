import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Theme } from '../theme/theme';
import type { ReviewItem } from '../types/review';
import { navigate } from '../router';
import { checkFreshItems, continueSession, resetSession } from '../state/session';
import { sessionStats } from '../state/stats';
import { formatClock } from '../state/timer';
import { Starfield } from '../components/Starfield';

export function Reward({ theme }: { theme: Theme }): JSX.Element {
  const stats = sessionStats.value;
  const [fresh, setFresh] = useState<ReviewItem[] | null>(null);
  const [quipIndex, setQuipIndex] = useState(0);

  const headline = theme.rewardHeadlines[stats.reviewed % theme.rewardHeadlines.length];

  // Check for items that arrived during the session (PRD §7.5) — once.
  useEffect(() => {
    let cancelled = false;
    checkFreshItems()
      .then((items) => !cancelled && setFresh(items))
      .catch(() => !cancelled && setFresh([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Rotating quips — the light Easter egg.
  useEffect(() => {
    const id = setInterval(() => setQuipIndex((i) => (i + 1) % theme.quips.length), 6000);
    return () => clearInterval(id);
  }, [theme.quips.length]);

  const totalSentiment = stats.sentiment.like + stats.sentiment.neutral + stats.sentiment.dislike;

  return (
    <main class="relative mx-auto w-full max-w-2xl flex-1 px-5 pb-12 pt-6 text-center">
      <Starfield />
      <div class="relative z-10">
        <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {theme.shipHeader}
        </p>
        <h1 class="my-2 text-3xl font-bold text-primary">{headline}</h1>
        <p class="min-h-10 italic text-muted-foreground" aria-live="polite">
          {theme.quips[quipIndex]}
        </p>

        <div class="my-6 flex flex-wrap justify-center gap-3">
          <StatCard value={String(stats.reviewed)} label="items reviewed" />
          <StatCard
            value={formatClock(stats.elapsedMs)}
            label={`of ${stats.targetMinutes} min goal`}
          />
          <StatCard value={String(stats.itemsWithEdits)} label="items edited" />
          <StatCard value={String(stats.annotationCount)} label="section annotations" />
          {stats.skipped > 0 && <StatCard value={String(stats.skipped)} label="skipped" />}
        </div>

        {totalSentiment > 0 && (
          <div class="mb-4">
            <h2 class="mb-2 text-base font-semibold">Sentiment</h2>
            <div
              class="mx-auto flex h-3.5 max-w-sm overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${stats.sentiment.like} liked, ${stats.sentiment.neutral} neutral, ${stats.sentiment.dislike} disliked`}
            >
              {stats.sentiment.like > 0 && (
                <div
                  class="bg-success"
                  style={{ flexGrow: stats.sentiment.like }}
                  title={`👍 ${stats.sentiment.like}`}
                />
              )}
              {stats.sentiment.neutral > 0 && (
                <div
                  class="bg-muted-foreground"
                  style={{ flexGrow: stats.sentiment.neutral }}
                  title={`😐 ${stats.sentiment.neutral}`}
                />
              )}
              {stats.sentiment.dislike > 0 && (
                <div
                  class="bg-destructive"
                  style={{ flexGrow: stats.sentiment.dislike }}
                  title={`👎 ${stats.sentiment.dislike}`}
                />
              )}
            </div>
            <p class="mt-1 text-sm text-muted-foreground">
              👍 {stats.sentiment.like} · 😐 {stats.sentiment.neutral} · 👎{' '}
              {stats.sentiment.dislike}
              {stats.sentiment.none > 0 && ` · no sentiment ${stats.sentiment.none}`}
            </p>
          </div>
        )}

        {(stats.arms.A > 0 || stats.arms.B > 0) && (
          <p class="text-sm text-muted-foreground">
            A/B split — arm A: {stats.arms.A} · arm B: {stats.arms.B}
          </p>
        )}

        {fresh && fresh.length > 0 && (
          <div class="card mx-auto my-6 max-w-md">
            <section>
              <p class="mb-3">{theme.freshItemsPrompt}</p>
              <button
                class="btn"
                onClick={() => {
                  continueSession(fresh);
                  navigate('review');
                }}
              >
                Keep Reviewing ({fresh.length} new)
              </button>
            </section>
          </div>
        )}

        <div class="mt-6 flex justify-center gap-4">
          <button
            class="btn"
            onClick={() => {
              resetSession();
              navigate('configure');
            }}
          >
            Start Another Session
          </button>
          <button
            class="btn"
            data-variant="ghost"
            onClick={() => {
              resetSession();
              navigate('landing');
            }}
          >
            Exit
          </button>
        </div>
      </div>
    </main>
  );
}

function StatCard({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <div class="card min-w-[7.5rem] px-4 py-3 text-left">
      <span class="block font-mono text-2xl font-bold text-primary">{value}</span>
      <span class="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
