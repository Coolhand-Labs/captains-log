/**
 * Coolhand OAuth2 authorization-code + PKCE flow (PRD §6.1 Path B, §9.3).
 * The Coolhand-side endpoints are net-new (docs/coolhand-issues/04); in dev the
 * flow runs against the mock middleware in mock-oauth-plugin.ts.
 */

const STORAGE_STATE = 'captainslog.oauth.state';
const STORAGE_VERIFIER = 'captainslog.oauth.verifier';

/**
 * Boot-time hook (called from main.tsx before render): OAuth providers redirect
 * back with ?code=&state= query params, which coexist with hash routing.
 * Full token exchange is implemented with the auth module; until then this
 * validates state and clears the query string so the router boots cleanly.
 */
export async function handleOAuthCallback(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code')) return;

  const expectedState = sessionStorage.getItem(STORAGE_STATE);
  if (!expectedState || params.get('state') !== expectedState) {
    console.warn('[captainslog] OAuth callback with missing/mismatched state — ignoring.');
  }
  sessionStorage.removeItem(STORAGE_STATE);
  sessionStorage.removeItem(STORAGE_VERIFIER);

  // Remove ?code=&state= without reloading, preserving any hash route.
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState(null, '', url.toString());
}
