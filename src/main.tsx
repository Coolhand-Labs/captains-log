import { render } from 'preact';
import { App } from './app';
import { loadRuntimeConfig } from './config/runtime-config';
import { installFeedbackTransport } from './services/feedback-transport';
import { handleOAuthCallback } from './services/auth/oauth';
import { authState, restoreAuthState } from './services/auth/auth';
import { createHttpProvider } from './services/api-client';
import { provider } from './state/session';
import './theme/tokens.css';
import './styles.css';

async function boot(): Promise<void> {
  // Must be installed before any coolhand-js widget can fire a request.
  installFeedbackTransport();
  await loadRuntimeConfig();
  restoreAuthState();
  if (authState.value.kind !== 'demo') provider.value = createHttpProvider();
  // OAuth providers redirect back with ?code=&state= query params (coexists with hash routing).
  await handleOAuthCallback();
  render(<App />, document.getElementById('app')!);
}

void boot();
