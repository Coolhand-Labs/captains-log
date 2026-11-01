import type { JSX } from 'preact';
import { signal } from '@preact/signals';
import type { Theme } from '../theme/theme';
import { navigate } from '../router';
import { startDemo } from '../state/session';
import { entryPoints } from '../config/entry-points';
import { authState, signOut } from '../services/auth/auth';
import { beginOAuthLogin } from '../services/auth/oauth';
import { CustomBackendModal } from './CustomBackendModal';

const customBackendOpen = signal(false);
const remember = signal(false);

export function Landing({ theme }: { theme: Theme }): JSX.Element {
  return (
    <main class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 pb-12 pt-6 text-center">
      <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {theme.shipHeader}
      </p>
      <h1 class="my-2 text-5xl font-bold text-primary">{theme.appName}</h1>
      <p class="mx-auto mb-8 max-w-xl text-muted-foreground">{theme.landingTagline}</p>

      <div class="mb-6 flex flex-wrap justify-center gap-4">
        {entryPoints.value.map((entry, i) =>
          entry.type === 'demo' ? (
            <button
              key={`demo-${i}`}
              class="btn"
              data-size="lg"
              onClick={() => {
                startDemo();
                navigate('configure');
              }}
            >
              {entry.label ?? theme.landingDemoCta}
            </button>
          ) : (
            <button
              key={entry.id}
              class="btn"
              data-variant="outline"
              data-size="lg"
              onClick={() => void beginOAuthLogin(entry, remember.value)}
            >
              {entry.label}
            </button>
          ),
        )}
      </div>

      <p class="text-sm text-muted-foreground">
        The demo runs entirely in your browser with starship dummy data — no account, no network
        calls. Connect your data to review real workloads via one of the sign-in options above,
        or your own backend.
      </p>

      <label class="label mx-auto mt-4 w-fit gap-2 text-sm">
        <input
          class="input"
          type="checkbox"
          checked={remember.value}
          onChange={(e) => (remember.value = e.currentTarget.checked)}
        />
        Remember me on this device
      </label>

      <button
        class="btn mt-2"
        data-variant="link"
        data-size="sm"
        onClick={() => (customBackendOpen.value = true)}
      >
        {theme.landingCustomBackendCta}
      </button>

      {authState.value.kind !== 'demo' && (
        <p class="mt-2 text-sm text-muted-foreground">
          Signed in (
          {authState.value.kind === 'oauth'
            ? authState.value.label
            : 'custom backend'}
          ).{' '}
          <button class="btn" data-variant="link" data-size="sm" onClick={() => signOut()}>
            Sign out
          </button>
        </p>
      )}

      {customBackendOpen.value && (
        <CustomBackendModal
          remember={remember.value}
          onClose={() => (customBackendOpen.value = false)}
        />
      )}
    </main>
  );
}
