import { signal } from '@preact/signals';
import { runtimeConfig } from '../../config/runtime-config';

/**
 * Auth state (PRD §6.1): demo/none, Coolhand OAuth bearer tokens, or custom
 * backend credentials. Persisted per the captain's "remember me" choice.
 */
export type AuthState =
  | { kind: 'demo' }
  | {
      kind: 'coolhand_oauth';
      accessToken: string;
      refreshToken?: string;
      /** Epoch ms when the access token expires. */
      expiresAt: number;
    }
  | { kind: 'custom'; credential: string; scheme: 'x-api-key' | 'bearer' };

const STORAGE_KEY = 'captainslog.auth';

export const authState = signal<AuthState>({ kind: 'demo' });

export function setAuthState(state: AuthState, remember = false): void {
  authState.value = state;
  try {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — in-memory only */
  }
}

export function restoreAuthState(): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
    if (raw) authState.value = JSON.parse(raw) as AuthState;
  } catch {
    /* ignore corrupt state */
  }
}

/** Sign out clears every captainslog auth key (PRD §10). */
export function signOut(): void {
  authState.value = { kind: 'demo' };
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Headers for a given submission target, from the active auth path. */
export function getAuthHeaders(target: 'coolhand' | 'self_hosted'): Record<string, string> {
  const state = authState.value;
  if (target === 'coolhand') {
    if (state.kind === 'coolhand_oauth') return { Authorization: `Bearer ${state.accessToken}` };
    const apiKey = runtimeConfig.value.coolhandApiKey;
    return apiKey ? { 'X-API-Key': apiKey } : {};
  }
  if (state.kind === 'custom') {
    return state.scheme === 'bearer'
      ? { Authorization: `Bearer ${state.credential}` }
      : { 'X-API-Key': state.credential };
  }
  if (state.kind === 'coolhand_oauth') return { Authorization: `Bearer ${state.accessToken}` };
  return {};
}
