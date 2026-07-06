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
    const id = setInterval(
      () => setQuipIndex((i) => (i + 1) % theme.quips.length),
      6000,
    );
    return () => clearInterval(id);
  }, [theme.quips.length]);

  const totalSentiment = stats.sentiment.like + stats.sentiment.neutral + stats.sentiment.dislike;

  return (
    <main class="cl-screen cl-reward">
      <Starfield />
      <div class="cl-reward-content">
        <p class="cl-ship-header">{theme.shipHeader}</p>
        <h1 class="cl-reward-headline">{headline}</h1>
        <p class="cl-quip" aria-live="polite">
          {theme.quips[quipIndex]}
        </p>

        <div class="cl-stat-cards">
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
          <div class="cl-sentiment-breakdown">
            <h2>Sentiment</h2>
            <div
              class="cl-sentiment-bar"
              role="img"
              aria-label={`${stats.sentiment.like} liked, ${stats.sentiment.neutral} neutral, ${stats.sentiment.dislike} disliked`}
            >
              {stats.sentiment.like > 0 && (
                <div
                  class="cl-bar-like"
                  style={{ flexGrow: stats.sentiment.like }}
                  title={`👍 ${stats.sentiment.like}`}
                />
              )}
              {stats.sentiment.neutral > 0 && (
                <div
                  class="cl-bar-neutral"
                  style={{ flexGrow: stats.sentiment.neutral }}
                  title={`😐 ${stats.sentiment.neutral}`}
                />
              )}
              {stats.sentiment.dislike > 0 && (
                <div
                  class="cl-bar-dislike"
                  style={{ flexGrow: stats.sentiment.dislike }}
                  title={`👎 ${stats.sentiment.dislike}`}
                />
              )}
            </div>
            <p class="cl-hint">
              👍 {stats.sentiment.like} · 😐 {stats.sentiment.neutral} · 👎{' '}
              {stats.sentiment.dislike}
              {stats.sentiment.none > 0 && ` · no sentiment ${stats.sentiment.none}`}
            </p>
          </div>
        )}

        {(stats.arms.A > 0 || stats.arms.B > 0) && (
          <p class="cl-hint">
            A/B split — arm A: {stats.arms.A} · arm B: {stats.arms.B}
          </p>
        )}

        {fresh && fresh.length > 0 && (
          <div class="cl-fresh-offer cl-card">
            <p>{theme.freshItemsPrompt}</p>
            <button
              class="cl-btn-primary"
              onClick={() => {
                continueSession(fresh);
                navigate('review');
              }}
            >
              Keep Reviewing ({fresh.length} new)
            </button>
          </div>
        )}

        <div class="cl-reward-actions">
          <button
            class="cl-btn-primary"
            onClick={() => {
              resetSession();
              navigate('configure');
            }}
          >
            Start Another Session
          </button>
          <button
            class="cl-btn-ghost"
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
    <div class="cl-stat-card cl-card">
      <span class="cl-stat-value">{value}</span>
      <span class="cl-stat-label">{label}</span>
    </div>
  );
}
