/**
 * Coolhand's feedback API endpoint (PRD §9.2) — used by feedback-encoder.ts for
 * real submissions in coolhand/both modes.
 */
export const COOLHAND_FEEDBACK_URL = 'https://coolhandlabs.com/api/v2/llm_request_log_feedbacks';

/**
 * Sentinel endpoint injected into coolhand-js via its `apiUrl` init option
 * (coolhand-js ≥ the apiUrl PR). Widgets submit here; feedback-transport.ts
 * intercepts exactly this URL and turns submissions into local drafts. The
 * `.invalid` TLD is reserved (RFC 2606), so nothing can ever resolve it.
 */
export const WIDGET_CAPTURE_URL =
  'https://feedback-capture.captainslog.invalid/llm_request_log_feedbacks';

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
