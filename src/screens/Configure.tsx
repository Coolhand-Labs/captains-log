import type { JSX } from 'preact';
import type { Theme } from '../theme/theme';
import { navigate } from '../router';

export function Configure({ theme }: { theme: Theme }): JSX.Element {
  return (
    <main class="cl-screen">
      <p class="cl-ship-header">{theme.shipHeader}</p>
      <h1>Configure Session</h1>
      <p class="cl-hint">Sampling controls land with the sampling milestone.</p>
      <button class="cl-btn-primary" onClick={() => navigate('review')}>
        Start Reviewing
      </button>
    </main>
  );
}
