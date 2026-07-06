import { describe, it, expect, beforeEach, vi } from 'vitest';
import { completeOAuthLogin } from './oauth';
import { authState, getAuthHeaders, setAuthState, signOut } from './auth';

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
});

describe('OAuth authorization-code + PKCE', () => {
  it('rejects a callback whose state does not match', async () => {
    sessionStorage.setItem('captainslog.oauth.state', 'expected');
    sessionStorage.setItem('captainslog.oauth.verifier', 'v'.repeat(43));
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

  it('exchanges the code (with the PKCE verifier) and stores bearer tokens', async () => {
    stubTokenEndpoint();
    sessionStorage.setItem('captainslog.oauth.state', 's1');
    sessionStorage.setItem('captainslog.oauth.verifier', 'verifier-123');

    const ok = await completeOAuthLogin(new URLSearchParams({ code: 'code-1', state: 's1' }));
    expect(ok).toBe(true);

    const call = (window.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = call[1].body as URLSearchParams;
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('code-1');
    expect(body.get('code_verifier')).toBe('verifier-123');

    expect(authState.value).toMatchObject({ kind: 'coolhand_oauth', accessToken: 'test-access' });
    expect(getAuthHeaders('coolhand')).toEqual({ Authorization: 'Bearer test-access' });
    // One-shot: the pending state/verifier are consumed.
    expect(sessionStorage.getItem('captainslog.oauth.verifier')).toBeNull();
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
