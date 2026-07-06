/**
 * Mirror of coolhand-js's hardcoded feedback endpoint.
 * Pinned to sdks/coolhand-js/src/constants.ts:4 (COOLHAND_API_URL) — the UMD bundle
 * only exposes its default export, so the constant cannot be imported at runtime.
 * The feedback transport intercepts widget fetches to this URL. If coolhand-js gains
 * an `apiUrl` init option (upstream PR candidate), thread it through instead.
 */
export const COOLHAND_FEEDBACK_URL = 'https://coolhandlabs.com/api/v2/llm_request_log_feedbacks';

/** Coolhand-hosted review queue (PRD §9.1 — endpoint is net-new, see docs/coolhand-issues/01). */
export const COOLHAND_REVIEW_QUEUE_URL = 'https://coolhandlabs.com/captain/review-queue';

/** Coolhand OAuth endpoints (PRD §9.3 — net-new, see docs/coolhand-issues/04). */
export const COOLHAND_OAUTH_AUTHORIZE_URL = 'https://coolhandlabs.com/oauth/authorize';
export const COOLHAND_OAUTH_TOKEN_URL = 'https://coolhandlabs.com/oauth/token';

declare const __CAPTAINSLOG_VERSION__: string;
export const VERSION =
  typeof __CAPTAINSLOG_VERSION__ !== 'undefined' ? __CAPTAINSLOG_VERSION__ : '0.0.0';

/** `collector` value stamped on every feedback record captainslog submits. */
export const COLLECTOR = `captainslog-${VERSION}`;

/** Rough minutes-per-item used for session projections. */
export const EST_MIN_PER_ITEM = 1.5;
