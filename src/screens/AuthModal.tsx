import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Theme } from '../theme/theme';
import { navigate } from '../router';
import { runtimeConfig } from '../config/runtime-config';
import { authState, setAuthState, signOut } from '../services/auth/auth';
import { beginOAuthLogin } from '../services/auth/oauth';
import { createHttpProvider } from '../services/api-client';
import { provider, startDemo } from '../state/session';

interface Props {
  theme: Theme;
  onClose: () => void;
}

/**
 * Auth entry point (PRD §6.1): Demo/none, Coolhand OAuth (ALWAYS offered),
 * or custom backend credentials. Native <dialog> per Basecoat — modality,
 * focus trapping, and Escape handling come from the platform.
 */
export function AuthModal({ theme, onClose }: Props): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [remember, setRemember] = useState(false);
  const [customUrl, setCustomUrl] = useState(runtimeConfig.value.reviewQueueUrl);
  const [customFeedbackUrl, setCustomFeedbackUrl] = useState(
    runtimeConfig.value.feedbackUrl ?? '',
  );
  const [credential, setCredential] = useState('');
  const [scheme, setScheme] = useState<'x-api-key' | 'bearer'>('x-api-key');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Native close (Escape, close()) unmounts the component via the parent signal.
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onClose]);

  const connectCustom = () => {
    if (!customUrl || !credential) {
      setError('A backend URL and a credential are required.');
      return;
    }
    runtimeConfig.value = {
      ...runtimeConfig.value,
      mode: 'self_hosted',
      demo: false,
      reviewQueueUrl: customUrl.trim(),
      feedbackUrl: (customFeedbackUrl || customUrl).trim(),
    };
    setAuthState({ kind: 'custom', credential: credential.trim(), scheme }, remember);
    provider.value = createHttpProvider();
    onClose();
    navigate('configure');
  };

  return (
    <dialog
      ref={dialogRef}
      class="dialog"
      aria-labelledby="cl-auth-title"
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div class="w-full sm:max-w-md">
        <header>
          <h2 id="cl-auth-title">Connect Your Data</h2>
          <p>Choose how captainslog reads your review queue and where feedback goes.</p>
        </header>

        <section class="grid gap-3">
          {authState.value.kind !== 'demo' && (
            <p class="text-sm text-muted-foreground">
              Signed in (
              {authState.value.kind === 'coolhand_oauth' ? 'Coolhand' : 'custom backend'}).{' '}
              <button class="btn" data-variant="link" data-size="sm" onClick={() => signOut()}>
                Sign out
              </button>
            </p>
          )}

          <button
            class="btn w-full"
            onClick={() => {
              const cfg = runtimeConfig.value;
              if (cfg.mode === 'demo') {
                runtimeConfig.value = { ...cfg, mode: 'coolhand', demo: false };
              }
              void beginOAuthLogin(remember);
            }}
          >
            Sign in with Coolhand
          </button>

          {!showCustom ? (
            <button class="btn w-full" data-variant="outline" onClick={() => setShowCustom(true)}>
              Custom backend (API key)
            </button>
          ) : (
            <div class="grid gap-3 rounded-lg border border-border p-3">
              <div class="grid gap-1.5">
                <label class="label" for="cl-auth-url">
                  Review-queue URL
                </label>
                <input
                  id="cl-auth-url"
                  class="input"
                  type="url"
                  placeholder="https://your-backend.example.com/captain/review-queue"
                  value={customUrl}
                  onInput={(e) => setCustomUrl(e.currentTarget.value)}
                />
              </div>
              <div class="grid gap-1.5">
                <label class="label" for="cl-auth-feedback-url">
                  Feedback URL{' '}
                  <span class="font-normal text-muted-foreground">
                    (defaults to the review-queue URL)
                  </span>
                </label>
                <input
                  id="cl-auth-feedback-url"
                  class="input"
                  type="url"
                  value={customFeedbackUrl}
                  onInput={(e) => setCustomFeedbackUrl(e.currentTarget.value)}
                />
              </div>
              <div class="grid gap-1.5">
                <label class="label" for="cl-auth-credential">
                  Credential
                </label>
                <input
                  id="cl-auth-credential"
                  class="input"
                  type="password"
                  value={credential}
                  onInput={(e) => setCredential(e.currentTarget.value)}
                />
              </div>
              <div class="grid gap-1.5">
                <label class="label" for="cl-auth-scheme">
                  Sent as
                </label>
                <select
                  id="cl-auth-scheme"
                  class="select"
                  value={scheme}
                  onChange={(e) => setScheme(e.currentTarget.value as 'x-api-key' | 'bearer')}
                >
                  <option value="x-api-key">X-API-Key header</option>
                  <option value="bearer">Authorization: Bearer</option>
                </select>
              </div>
              <button class="btn" onClick={connectCustom}>
                Connect
              </button>
            </div>
          )}

          <button
            class="btn w-full"
            data-variant="ghost"
            onClick={() => {
              startDemo();
              onClose();
              navigate('configure');
            }}
          >
            {theme.landingDemoCta} instead
          </button>

          <label class="label gap-2">
            <input
              class="input"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.currentTarget.checked)}
            />
            Remember me on this device
          </label>

          {error && (
            <p class="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
        </section>

        <footer>
          <button
            class="btn"
            data-variant="outline"
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
        </footer>
      </div>
    </dialog>
  );
}
