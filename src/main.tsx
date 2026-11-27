import { render } from 'preact';
import { App } from './app';
import { loadRuntimeConfig } from './config/runtime-config';
import { loadEntryPoints } from './config/entry-points';
import { installFeedbackTransport } from './services/feedback-transport';
import { handleOAuthCallback } from './services/auth/oauth';
import { authState, restoreAuthState } from './services/auth/auth';
import { createHttpProvider } from './services/api-client';
import { provider } from './state/session';
import './styles.css';

async function boot(): Promise<void> {
  // Must be installed before any coolhand-js widget can fire a request.
  installFeedbackTransport();
  // entryPoints must resolve before handleOAuthCallback, which looks up the
  // provider id stashed at login time to complete the token exchange.
  await Promise.all([loadRuntimeConfig(), loadEntryPoints()]);
  restoreAuthState();
  if (authState.value.kind !== 'demo') provider.value = createHttpProvider();
  // OAuth providers redirect back with ?code=&state= query params (coexists with hash routing).
  await handleOAuthCallback();
  render(<App />, document.getElementById('app')!);
}

void boot();
