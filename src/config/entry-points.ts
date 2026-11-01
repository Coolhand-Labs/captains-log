import { signal } from '@preact/signals';
import { COOLHAND_FEEDBACK_URL, COOLHAND_REVIEW_QUEUE_URL } from './constants';

/**
 * Landing-page entry points (buttons), sourced from a deployer-provided
 * entry-points.json (or these code-shipped defaults when absent). Unlike a
 * typical "login with X" SSO list, each 'oauth' entry bundles a FULL
 * independent OAuth2 authorization-code+PKCE backend connection: the
 * resulting bearer token is used directly against that entry's own
 * reviewQueueUrl/feedbackUrl — logging in with a different entry means
 * talking to a different backend, not just a different identity source.
 */
export type EntryPoint =
  | { type: 'demo'; label?: string }
  | {
      type: 'oauth';
      /** Stable id — disambiguates the shared OAuth redirect callback (every
       *  entry shares the app's single root redirect_uri, see oauth.ts). */
      id: string;
      label: string;
      authorizeUrl: string;
      tokenUrl: string;
      clientId: string;
      /** Defaults to 'captain' (Coolhand's Doorkeeper default_scopes). */
      scope?: string;
      reviewQueueUrl: string;
      /** Defaults to Coolhand's production feedback endpoint if omitted. */
      feedbackUrl?: string;
      icon?: string;
    };

export function isOAuthEntryPoint(
  entry: EntryPoint,
): entry is Extract<EntryPoint, { type: 'oauth' }> {
  return entry.type === 'oauth';
}

const DEFAULT_ENTRY_POINTS: EntryPoint[] = [
  { type: 'demo' },
  {
    type: 'oauth',
    id: 'coolhand',
    label: 'Sign in with Coolhand',
    authorizeUrl: 'https://coolhandlabs.com/oauth/authorize',
    tokenUrl: 'https://coolhandlabs.com/oauth/token',
    // No default client_id — every deployment registers its own Doorkeeper
    // application (rake captainslog:register_oauth_client) against its own
    // redirect_uri. Ship an entry-points.json with the real id to activate.
    clientId: '',
    scope: 'captain',
    reviewQueueUrl: COOLHAND_REVIEW_QUEUE_URL,
    feedbackUrl: COOLHAND_FEEDBACK_URL,
  },
];

export const entryPoints = signal<EntryPoint[]>(DEFAULT_ENTRY_POINTS);

interface EntryPointsFile {
  entryPoints?: EntryPoint[];
}

/**
 * Merge pattern mirrors loadRuntimeConfig(): fetch the optional runtime file,
 * silently fall back to the code-shipped defaults on 404/failure so the
 * static bundle works with zero deployment configuration.
 */
export async function loadEntryPoints(): Promise<EntryPoint[]> {
  try {
    const res = await fetch('entry-points.json', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as EntryPointsFile;
      if (Array.isArray(data.entryPoints)) {
        entryPoints.value = data.entryPoints;
        return entryPoints.value;
      }
    }
  } catch {
    // No entry-points.json — code-shipped defaults apply.
  }
  entryPoints.value = DEFAULT_ENTRY_POINTS;
  return DEFAULT_ENTRY_POINTS;
}
