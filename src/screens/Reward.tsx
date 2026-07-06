import type { JSX } from 'preact';
import type { Theme } from '../theme/theme';
import { navigate } from '../router';

export function Reward({ theme }: { theme: Theme }): JSX.Element {
  return (
    <main class="cl-screen">
      <h1>{theme.rewardHeadlines[0]}</h1>
      <p class="cl-hint">Stats and starfield land with the reward milestone.</p>
      <button class="cl-btn-primary" onClick={() => navigate('landing')}>
        Exit
      </button>
    </main>
  );
}
