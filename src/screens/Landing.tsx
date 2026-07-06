import type { JSX } from 'preact';
import { signal } from '@preact/signals';
import type { Theme } from '../theme/theme';
import { navigate } from '../router';
import { startDemo } from '../state/session';
import { AuthModal } from './AuthModal';

const authModalOpen = signal(false);

export function Landing({ theme }: { theme: Theme }): JSX.Element {
  return (
    <main class="cl-screen cl-landing">
      <p class="cl-ship-header">{theme.shipHeader}</p>
      <h1 class="cl-landing-title">{theme.appName}</h1>
      <p class="cl-tagline">{theme.landingTagline}</p>

      <div class="cl-landing-ctas">
        <button
          class="cl-btn-primary cl-cta"
          onClick={() => {
            startDemo();
            navigate('configure');
          }}
        >
          {theme.landingDemoCta}
        </button>
        <button class="cl-cta" onClick={() => (authModalOpen.value = true)}>
          {theme.landingConnectCta}
        </button>
      </div>

      <p class="cl-hint">
        The demo runs entirely in your browser with starship dummy data — no account, no network
        calls. Connect your data to review real workloads via Coolhand or your own backend.
      </p>

      {authModalOpen.value && <AuthModal theme={theme} onClose={() => (authModalOpen.value = false)} />}
    </main>
  );
}
