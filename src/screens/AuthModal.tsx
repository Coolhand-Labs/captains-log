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
 * or custom backend credentials.
 */
export function AuthModal({ theme, onClose }: Props): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    return () => document.removeEventListener('keydown', onKey);
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
    <div class="cl-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        class="cl-modal cl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cl-auth-title"
      >
        <h2 id="cl-auth-title">Connect Your Data</h2>
        <p class="cl-hint">
          Choose how captainslog reads your review queue and where feedback goes.
        </p>

        {authState.value.kind !== 'demo' && (
          <p class="cl-hint">
            Signed in ({authState.value.kind === 'coolhand_oauth' ? 'Coolhand' : 'custom backend'}
            ).{' '}
            <button class="cl-btn-ghost" onClick={() => signOut()}>
              Sign out
            </button>
          </p>
        )}

        <div class="cl-auth-options">
          <button
            class="cl-btn-primary"
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
            <button onClick={() => setShowCustom(true)}>Custom backend (API key)</button>
          ) : (
            <div class="cl-custom-auth">
              <label>
                Review-queue URL
                <input
                  type="url"
                  placeholder="https://your-backend.example.com/captain/review-queue"
                  value={customUrl}
                  onInput={(e) => setCustomUrl(e.currentTarget.value)}
                />
              </label>
              <label>
                Feedback URL <span class="cl-hint">(defaults to the review-queue URL)</span>
                <input
                  type="url"
                  value={customFeedbackUrl}
                  onInput={(e) => setCustomFeedbackUrl(e.currentTarget.value)}
                />
              </label>
              <label>
                Credential
                <input
                  type="password"
                  value={credential}
                  onInput={(e) => setCredential(e.currentTarget.value)}
                />
              </label>
              <label>
                Sent as{' '}
                <select
                  value={scheme}
                  onChange={(e) => setScheme(e.currentTarget.value as 'x-api-key' | 'bearer')}
                >
                  <option value="x-api-key">X-API-Key header</option>
                  <option value="bearer">Authorization: Bearer</option>
                </select>
              </label>
              <button class="cl-btn-primary" onClick={connectCustom}>
                Connect
              </button>
            </div>
          )}

          <button
            class="cl-btn-ghost"
            onClick={() => {
              startDemo();
              onClose();
              navigate('configure');
            }}
          >
            {theme.landingDemoCta} instead
          </button>
        </div>

        <label class="cl-remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.currentTarget.checked)}
          />{' '}
          Remember me on this device
        </label>

        {error && (
          <p class="cl-error" role="alert">
            {error}
          </p>
        )}

        <button class="cl-btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
