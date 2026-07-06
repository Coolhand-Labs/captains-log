import type { JSX } from 'preact';
import type { Theme } from '../theme/theme';
import { navigate } from '../router';

export function Review({ theme: _theme }: { theme: Theme }): JSX.Element {
  return (
    <main class="cl-screen">
      <h1>Review</h1>
      <p class="cl-hint">The review game lands with the session milestone.</p>
      <button onClick={() => navigate('reward')}>Finish Session</button>
    </main>
  );
}
