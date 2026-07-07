import type { JSX } from 'preact';
import { signal } from '@preact/signals';
import type { Theme } from '../theme/theme';
import { navigate } from '../router';
import { startDemo } from '../state/session';
import { AuthModal } from './AuthModal';

const authModalOpen = signal(false);

export function Landing({ theme }: { theme: Theme }): JSX.Element {
  return (
    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 pb-12 pt-6 text-center">
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {theme.shipHeader}
      </p>
      <h1 class="my-2 text-5xl font-bold text-primary">{theme.appName}</h1>
      <p class="mx-auto mb-8 max-w-xl text-muted-foreground">{theme.landingTagline}</p>

      <div class="mb-6 flex flex-wrap justify-center gap-4">
        <button
          class="btn"
          data-size="lg"
          onClick={() => {
            startDemo();
            navigate('configure');
          }}
        >
          {theme.landingDemoCta}
        </button>
        <button
          class="btn"
          data-variant="outline"
          data-size="lg"
          onClick={() => (authModalOpen.value = true)}
        >
          {theme.landingConnectCta}
        </button>
      </div>

      <p class="text-sm text-muted-foreground">
        The demo runs entirely in your browser with starship dummy data — no account, no network
        calls. Connect your data to review real workloads via Coolhand or your own backend.
      </p>

      {authModalOpen.value && <AuthModal theme={theme} onClose={() => (authModalOpen.value = false)} />}
    </main>
  );
}
