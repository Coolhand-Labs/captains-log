import { signal } from '@preact/signals';
import { COOLHAND_REVIEW_QUEUE_URL } from './constants';

/**
 * Backend/data mode (PRD §6.2):
 * - demo: in-memory Star Trek data, zero network
 * - coolhand: read queue from + write feedback to Coolhand
 * - self_hosted: your own backend implementing the documented contract
 * - both: read per config, write feedback to BOTH endpoints
 */
export type Mode = 'demo' | 'coolhand' | 'self_hosted' | 'both';

export interface RuntimeConfig {
  mode: Mode;
  /** Review-queue endpoint. Defaults to Coolhand's for coolhand mode. */
  reviewQueueUrl: string;
  /** Self-hosted feedback endpoint base (POST {feedbackUrl}/{id}/feedback). */
  feedbackUrl?: string;
  coolhandOauthClientId?: string;
  coolhandApiKey?: string;
  /** Optional hardcoded creator_unique_id (PRD §6.1 Path B). */
  creatorId?: string;
  /** Force demo mode on/off regardless of other settings. */
  demo: boolean;
}

const DEFAULTS: RuntimeConfig = {
  mode: 'demo',
  reviewQueueUrl: COOLHAND_REVIEW_QUEUE_URL,
  demo: true,
};

export const runtimeConfig = signal<RuntimeConfig>(DEFAULTS);

function fromEnv(): Partial<RuntimeConfig> {
  const env = import.meta.env;
  const out: Partial<RuntimeConfig> = {};
  if (env.VITE_MODE) out.mode = env.VITE_MODE as Mode;
  if (env.VITE_REVIEW_QUEUE_URL) out.reviewQueueUrl = env.VITE_REVIEW_QUEUE_URL;
  if (env.VITE_FEEDBACK_URL) out.feedbackUrl = env.VITE_FEEDBACK_URL;
  if (env.VITE_COOLHAND_OAUTH_CLIENT_ID) out.coolhandOauthClientId = env.VITE_COOLHAND_OAUTH_CLIENT_ID;
  if (env.VITE_COOLHAND_API_KEY) out.coolhandApiKey = env.VITE_COOLHAND_API_KEY;
  if (env.VITE_CREATOR_ID) out.creatorId = env.VITE_CREATOR_ID;
  if (env.VITE_DEMO !== undefined) out.demo = env.VITE_DEMO === 'true';
  return out;
}

/**
 * Merge order: defaults ← build-time env (VITE_*) ← runtime /config.json.
 * config.json is optional; a 404 (or any fetch failure) is silently ignored so the
 * static bundle works with zero deployment configuration (demo mode).
 */
export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  let fileConfig: Partial<RuntimeConfig> = {};
  try {
    const res = await fetch('config.json', { headers: { Accept: 'application/json' } });
    if (res.ok) fileConfig = (await res.json()) as Partial<RuntimeConfig>;
  } catch {
    // No config.json — demo defaults apply.
  }
  const merged = { ...DEFAULTS, ...fromEnv(), ...fileConfig };
  if (merged.demo) merged.mode = 'demo';
  runtimeConfig.value = merged;
  return merged;
}
