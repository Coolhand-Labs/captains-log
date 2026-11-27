import { describe, it, expect, beforeEach, vi } from 'vitest';
import { completeOAuthLogin } from './oauth';
import { authState, getAuthHeaders, setAuthState, signOut } from './auth';
import { entryPoints, type EntryPoint } from '../../config/entry-points';
import { runtimeConfig } from '../../config/runtime-config';

const coolhandEntry: EntryPoint = {
  type: 'oauth',
  id: 'coolhand',
  label: 'Sign in with Coolhand',
  authorizeUrl: 'https://coolhandlabs.example/oauth/authorize',
  tokenUrl: 'https://coolhandlabs.example/oauth/token',
  clientId: 'coolhand-client',
  scope: 'captain',
  reviewQueueUrl: 'https://coolhandlabs.example/captain/review-queue',
  feedbackUrl: 'https://coolhandlabs.example/api/v2/llm_request_log_feedbacks',
};

const acmeEntry: EntryPoint = {
  type: 'oauth',
  id: 'acme',
  label: 'Sign in with Acme',
  authorizeUrl: 'https://acme.example/oauth/authorize',
  tokenUrl: 'https://acme.example/oauth/token',
  clientId: 'acme-client',
  scope: 'captain',
  reviewQueueUrl: 'https://acme.example/captain/review-queue',
  feedbackUrl: 'https://acme.example/api/v2/llm_request_log_feedbacks',
};

function stubTokenEndpoint(): void {
  window.fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          access_token: 'test-access',
          refresh_token: 'test-refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  ) as unknown as typeof window.fetch;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  signOut();
  entryPoints.value = [{ type: 'demo' }, coolhandEntry, acmeEntry];
});

describe('OAuth authorization-code + PKCE', () => {
  it('rejects a callback whose state does not match', async () => {
    sessionStorage.setItem('captainslog.oauth.state', 'expected');
    sessionStorage.setItem('captainslog.oauth.verifier', 'v'.repeat(43));
    sessionStorage.setItem('captainslog.oauth.provider', 'coolhand');
    const ok = await completeOAuthLogin(
      new URLSearchParams({ code: 'abc', state: 'tampered' }),
    );
    expect(ok).toBe(false);
    expect(authState.value.kind).toBe('demo');
  });

  it('rejects a callback with no pending login (no verifier)', async () => {
    const ok = await completeOAuthLogin(new URLSearchParams({ code: 'abc', state: 'x' }));
    expect(ok).toBe(false);
  });

  it('rejects a callback whose stored provider id no longer matches any entry', async () => {
    stubTokenEndpoint();
    sessionStorage.setItem('captainslog.oauth.state', 's1');
    sessionStorage.setItem('captainslog.oauth.verifier', 'verifier-123');
    sessionStorage.setItem('captainslog.oauth.provider', 'removed-provider');

    const ok = await completeOAuthLogin(new URLSearchParams({ code: 'code-1', state: 's1' }));
    expect(ok).toBe(false);
    expect(authState.value.kind).toBe('demo');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('exchanges the code (with the PKCE verifier) and stores bearer tokens', async () => {
    stubTokenEndpoint();
    sessionStorage.setItem('captainslog.oauth.state', 's1');
    sessionStorage.setItem('captainslog.oauth.verifier', 'verifier-123');
    sessionStorage.setItem('captainslog.oauth.provider', 'coolhand');

    const ok = await completeOAuthLogin(new URLSearchParams({ code: 'code-1', state: 's1' }));
    expect(ok).toBe(true);

    const call = (window.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[0]).toBe(coolhandEntry.tokenUrl);
    const body = call[1].body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('code-1');
    expect(body.get('code_verifier')).toBe('verifier-123');
    expect(body.get('redirect_uri')).toBe(window.location.origin + window.location.pathname);

    expect(authState.value).toMatchObject({
      kind: 'oauth',
      providerId: 'coolhand',
      accessToken: 'test-access',
    });
    expect(getAuthHeaders('coolhand')).toEqual({ Authorization: 'Bearer test-access' });
    expect(runtimeConfig.value.reviewQueueUrl).toBe(coolhandEntry.reviewQueueUrl);
    expect(runtimeConfig.value.coolhandFeedbackUrl).toBe(coolhandEntry.feedbackUrl);
    // One-shot: the pending state/verifier/provider are consumed.
    expect(sessionStorage.getItem('captainslog.oauth.verifier')).toBeNull();
    expect(sessionStorage.getItem('captainslog.oauth.provider')).toBeNull();
  });

  it('disambiguates between multiple oauth entries via the stored provider id', async () => {
    stubTokenEndpoint();
    sessionStorage.setItem('captainslog.oauth.state', 's2');
    sessionStorage.setItem('captainslog.oauth.verifier', 'verifier-456');
    sessionStorage.setItem('captainslog.oauth.provider', 'acme');

    const ok = await completeOAuthLogin(new URLSearchParams({ code: 'code-2', state: 's2' }));
    expect(ok).toBe(true);

    const call = (window.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(call[0]).toBe(acmeEntry.tokenUrl);
    const body = call[1].body as URLSearchParams;
    expect(body.get('redirect_uri')).toBe(window.location.origin + window.location.pathname);

    expect(authState.value).toMatchObject({ kind: 'oauth', providerId: 'acme' });
    expect(runtimeConfig.value.reviewQueueUrl).toBe(acmeEntry.reviewQueueUrl);
    expect(runtimeConfig.value.coolhandFeedbackUrl).toBe(acmeEntry.feedbackUrl);
  });
});

describe('auth state & headers', () => {
  it('custom credentials map to the chosen header scheme', () => {
    setAuthState({ kind: 'custom', credential: 'sek-ret', scheme: 'x-api-key' });
    expect(getAuthHeaders('self_hosted')).toEqual({ 'X-API-Key': 'sek-ret' });
    setAuthState({ kind: 'custom', credential: 'sek-ret', scheme: 'bearer' });
    expect(getAuthHeaders('self_hosted')).toEqual({ Authorization: 'Bearer sek-ret' });
  });

  it('signOut clears storage and reverts to demo', () => {
    setAuthState({ kind: 'custom', credential: 'x', scheme: 'bearer' }, true);
    expect(localStorage.getItem('captainslog.auth')).not.toBeNull();
    signOut();
    expect(authState.value.kind).toBe('demo');
    expect(localStorage.getItem('captainslog.auth')).toBeNull();
    expect(sessionStorage.getItem('captainslog.auth')).toBeNull();
  });
});
