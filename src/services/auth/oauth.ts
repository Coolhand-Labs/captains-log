import { COOLHAND_FEEDBACK_URL } from '../../config/constants';
import { entryPoints, isOAuthEntryPoint, type EntryPoint } from '../../config/entry-points';
import { runtimeConfig } from '../../config/runtime-config';
import { setAuthState, signOut } from './auth';
import { provider } from '../../state/session';
import { createHttpProvider } from '../api-client';
import { navigate } from '../../router';

type OAuthEntryPoint = Extract<EntryPoint, { type: 'oauth' }>;

/**
 * Generic OAuth2 authorization-code + PKCE flow, driven by whichever entry
 * point the captain clicked on the Landing page (config/entry-points.ts).
 * Every entry shares this app's single root redirect_uri (no dedicated
 * `/callback` route exists — this is a hash router, and the callback is
 * handled procedurally at boot via ?code=&state= query params), so the
 * clicked entry's id is stashed in sessionStorage to disambiguate which
 * provider's token endpoint/config to use once the browser redirects back.
 */

const STORAGE_STATE = 'captainslog.oauth.state';
const STORAGE_VERIFIER = 'captainslog.oauth.verifier';
const STORAGE_REMEMBER = 'captainslog.oauth.remember';
const STORAGE_PROVIDER = 'captainslog.oauth.provider';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

function randomString(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function base64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(digest);
}

/**
 * In dev, an entry with no configured client id runs against
 * mock-oauth-plugin.ts instead of its real authorize/token URLs — the mock
 * itself is provider-agnostic (disambiguation happens client-side via
 * STORAGE_PROVIDER, not by which endpoint issued the token), so any number
 * of unconfigured entries can share it.
 */
function resolveOAuthEndpoints(entry: OAuthEntryPoint): {
  authorize: string;
  token: string;
  clientId: string;
} {
  if (import.meta.env.DEV && !entry.clientId) {
    return { authorize: '/mock-oauth/authorize', token: '/mock-oauth/token', clientId: `${entry.id}-dev` };
  }
  return { authorize: entry.authorizeUrl, token: entry.tokenUrl, clientId: entry.clientId };
}

function redirectUri(): string {
  return window.location.origin + window.location.pathname;
}

export async function beginOAuthLogin(entry: OAuthEntryPoint, remember = false): Promise<void> {
  const { authorize, clientId } = resolveOAuthEndpoints(entry);
  const state = randomString(16);
  const verifier = randomString(32);
  sessionStorage.setItem(STORAGE_STATE, state);
  sessionStorage.setItem(STORAGE_VERIFIER, verifier);
  sessionStorage.setItem(STORAGE_REMEMBER, remember ? '1' : '0');
  sessionStorage.setItem(STORAGE_PROVIDER, entry.id);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri(),
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
    scope: entry.scope ?? 'captain',
  });
  window.location.assign(`${authorize}?${params}`);
}

async function exchangeToken(tokenUrl: string, body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  return (await res.json()) as TokenResponse;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Silent refresh at ~80% of the token lifetime; on failure, sign out (re-prompt). */
function scheduleRefresh(entry: OAuthEntryPoint, refreshToken: string | undefined, expiresInSec: number): void {
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  if (!refreshToken) return;
  refreshTimer = setTimeout(
    async () => {
      try {
        const { token, clientId } = resolveOAuthEndpoints(entry);
        const tokens = await exchangeToken(
          token,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
          }),
        );
        applyTokens(entry, tokens, localStorage.getItem('captainslog.auth') !== null);
      } catch {
        signOut();
        navigate('landing');
      }
    },
    Math.max(5_000, expiresInSec * 1000 * 0.8),
  );
}

function applyTokens(entry: OAuthEntryPoint, tokens: TokenResponse, remember: boolean): void {
  setAuthState(
    {
      kind: 'oauth',
      providerId: entry.id,
      label: entry.label,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    },
    remember,
  );
  // An explicit sign-in is an explicit intent to switch backends, so this
  // overwrites reviewQueueUrl/coolhandFeedbackUrl unconditionally rather than
  // only when starting from demo mode.
  runtimeConfig.value = {
    ...runtimeConfig.value,
    mode: 'coolhand',
    demo: false,
    reviewQueueUrl: entry.reviewQueueUrl,
    coolhandFeedbackUrl: entry.feedbackUrl ?? COOLHAND_FEEDBACK_URL,
  };
  scheduleRefresh(entry, tokens.refresh_token, tokens.expires_in);
}

/** Returns true when a login completed. Exported for tests. */
export async function completeOAuthLogin(params: URLSearchParams): Promise<boolean> {
  const expectedState = sessionStorage.getItem(STORAGE_STATE);
  const verifier = sessionStorage.getItem(STORAGE_VERIFIER);
  const remember = sessionStorage.getItem(STORAGE_REMEMBER) === '1';
  const providerId = sessionStorage.getItem(STORAGE_PROVIDER);
  sessionStorage.removeItem(STORAGE_STATE);
  sessionStorage.removeItem(STORAGE_VERIFIER);
  sessionStorage.removeItem(STORAGE_REMEMBER);
  sessionStorage.removeItem(STORAGE_PROVIDER);

  const code = params.get('code');
  if (!code || !verifier || !expectedState || params.get('state') !== expectedState) {
    console.warn('[captainslog] OAuth callback rejected: missing or mismatched state.');
    return false;
  }

  const entry = entryPoints.value.find(
    (e): e is OAuthEntryPoint => isOAuthEntryPoint(e) && e.id === providerId,
  );
  if (!entry) {
    console.warn('[captainslog] OAuth callback rejected: unknown or stale provider id.', providerId);
    return false;
  }

  const { token, clientId } = resolveOAuthEndpoints(entry);
  const tokens = await exchangeToken(
    token,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: clientId,
    }),
  );
  applyTokens(entry, tokens, remember);
  return true;
}

/**
 * Boot-time hook (called from main.tsx before render): OAuth providers redirect
 * back with ?code=&state= query params, which coexist with hash routing.
 */
export async function handleOAuthCallback(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code')) return;

  let success = false;
  try {
    success = await completeOAuthLogin(params);
  } catch (e) {
    console.error('[captainslog] OAuth login failed:', e);
  }

  // Remove ?code=&state= without reloading, preserving any hash route.
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState(null, '', url.toString());

  if (success) {
    provider.value = createHttpProvider();
    navigate('configure');
  }
}
