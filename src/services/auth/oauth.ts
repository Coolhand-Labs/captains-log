import {
  COOLHAND_OAUTH_AUTHORIZE_URL,
  COOLHAND_OAUTH_TOKEN_URL,
} from '../../config/constants';
import { runtimeConfig } from '../../config/runtime-config';
import { setAuthState, signOut } from './auth';
import { provider } from '../../state/session';
import { createHttpProvider } from '../api-client';
import { navigate } from '../../router';

/**
 * Coolhand OAuth2 authorization-code + PKCE flow (PRD §6.1 Path B, §9.3).
 * The Coolhand-side endpoints are net-new (docs/coolhand-issues/04); in dev
 * (no client id configured) the flow runs against mock-oauth-plugin.ts.
 */

const STORAGE_STATE = 'captainslog.oauth.state';
const STORAGE_VERIFIER = 'captainslog.oauth.verifier';
const STORAGE_REMEMBER = 'captainslog.oauth.remember';

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

export function oauthEndpoints(): { authorize: string; token: string; clientId: string } {
  const cfg = runtimeConfig.value;
  if (import.meta.env.DEV && !cfg.coolhandOauthClientId) {
    return { authorize: '/mock-oauth/authorize', token: '/mock-oauth/token', clientId: 'captainslog-dev' };
  }
  return {
    authorize: COOLHAND_OAUTH_AUTHORIZE_URL,
    token: COOLHAND_OAUTH_TOKEN_URL,
    clientId: cfg.coolhandOauthClientId ?? '',
  };
}

function redirectUri(): string {
  return window.location.origin + window.location.pathname;
}

export async function beginOAuthLogin(remember = false): Promise<void> {
  const { authorize, clientId } = oauthEndpoints();
  const state = randomString(16);
  const verifier = randomString(32);
  sessionStorage.setItem(STORAGE_STATE, state);
  sessionStorage.setItem(STORAGE_VERIFIER, verifier);
  sessionStorage.setItem(STORAGE_REMEMBER, remember ? '1' : '0');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri(),
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
    scope: 'captain',
  });
  window.location.assign(`${authorize}?${params}`);
}

async function exchangeToken(body: URLSearchParams): Promise<TokenResponse> {
  const { token } = oauthEndpoints();
  const res = await fetch(token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  return (await res.json()) as TokenResponse;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Silent refresh at ~80% of the token lifetime; on failure, sign out (re-prompt). */
function scheduleRefresh(refreshToken: string | undefined, expiresInSec: number): void {
  if (refreshTimer !== null) clearTimeout(refreshTimer);
  if (!refreshToken) return;
  refreshTimer = setTimeout(
    async () => {
      try {
        const tokens = await exchangeToken(
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: oauthEndpoints().clientId,
          }),
        );
        applyTokens(tokens, localStorage.getItem('captainslog.auth') !== null);
      } catch {
        signOut();
        navigate('landing');
      }
    },
    Math.max(5_000, expiresInSec * 1000 * 0.8),
  );
}

function applyTokens(tokens: TokenResponse, remember: boolean): void {
  setAuthState(
    {
      kind: 'coolhand_oauth',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    },
    remember,
  );
  scheduleRefresh(tokens.refresh_token, tokens.expires_in);
}

/** Returns true when a login completed. Exported for tests. */
export async function completeOAuthLogin(params: URLSearchParams): Promise<boolean> {
  const expectedState = sessionStorage.getItem(STORAGE_STATE);
  const verifier = sessionStorage.getItem(STORAGE_VERIFIER);
  const remember = sessionStorage.getItem(STORAGE_REMEMBER) === '1';
  sessionStorage.removeItem(STORAGE_STATE);
  sessionStorage.removeItem(STORAGE_VERIFIER);
  sessionStorage.removeItem(STORAGE_REMEMBER);

  const code = params.get('code');
  if (!code || !verifier || !expectedState || params.get('state') !== expectedState) {
    console.warn('[captainslog] OAuth callback rejected: missing or mismatched state.');
    return false;
  }

  const tokens = await exchangeToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: oauthEndpoints().clientId,
    }),
  );
  applyTokens(tokens, remember);
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
    const cfg = runtimeConfig.value;
    if (cfg.mode === 'demo') runtimeConfig.value = { ...cfg, mode: 'coolhand', demo: false };
    provider.value = createHttpProvider();
    navigate('configure');
  }
}
