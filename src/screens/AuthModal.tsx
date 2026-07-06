import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Theme } from '../theme/theme';

interface Props {
  theme: Theme;
  onClose: () => void;
}

/**
 * Auth entry point (PRD §6.1). Three paths: Demo/none, Coolhand OAuth (always
 * offered), custom backend credentials. Wired to the auth module in the auth
 * milestone; the dialog shell (focus trap, Escape) is final.
 */
export function AuthModal({ theme: _theme, onClose }: Props): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
        <p class="cl-hint">Choose how captainslog reads your review queue and where feedback goes.</p>
        <div class="cl-auth-options">
          <button class="cl-btn-primary" disabled title="Available once Coolhand OAuth ships">
            Sign in with Coolhand
          </button>
          <button disabled title="Configure a custom backend (coming with the auth milestone)">
            Custom backend (API key)
          </button>
        </div>
        <button class="cl-btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
