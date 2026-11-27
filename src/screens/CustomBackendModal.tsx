import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { navigate } from '../router';
import { runtimeConfig } from '../config/runtime-config';
import { setAuthState } from '../services/auth/auth';
import { createHttpProvider } from '../services/api-client';
import { provider } from '../state/session';

interface Props {
  remember: boolean;
  onClose: () => void;
}

/**
 * Bring-your-own-backend escape hatch — not part of the curated,
 * config-driven entry-points list (config/entry-points.ts) since it's a
 * generic capability rather than an "acceptable" allowlisted integration.
 * Native <dialog> per Basecoat — modality, focus trapping, and Escape
 * handling come from the platform.
 */
export function CustomBackendModal({ remember, onClose }: Props): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
          <h2 id="cl-auth-title">Custom Backend</h2>
          <p>Connect a self-hosted backend implementing the documented contract.</p>
        </header>

        <section class="grid gap-3">
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

          {error && (
            <p class="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
        </section>

        <footer>
          <button class="btn" data-variant="outline" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
        </footer>
      </div>
    </dialog>
  );
}
