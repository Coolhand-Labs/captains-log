# Configuring captainslog

captainslog is a static frontend. Configuration merges three layers, later wins:

1. **Defaults** — demo mode, Coolhand endpoint URLs.
2. **Build-time env vars** — `VITE_*` variables baked in by `npm run build`.
3. **Runtime `config.json`** — a JSON file served next to `index.html`; edit without rebuilding.

If `demo` resolves to `true` (the default), captainslog forces demo mode regardless of other settings.

Which Landing-page buttons appear (Try Demo, and any OAuth/SSO sign-in options) is configured
separately — see [Entry points](#entry-points-entry-pointsjson) below.

## Keys

| config.json key | Env var | Meaning |
|---|---|---|
| `mode` | `VITE_MODE` | `demo` \| `coolhand` \| `self_hosted` \| `both` |
| `reviewQueueUrl` | `VITE_REVIEW_QUEUE_URL` | Review-queue endpoint (defaults to Coolhand's `/captain/review-queue`) |
| `feedbackUrl` | `VITE_FEEDBACK_URL` | Self-hosted feedback base; captainslog POSTs to `{feedbackUrl}/{id}/feedback` |
| `coolhandFeedbackUrl` | `VITE_COOLHAND_FEEDBACK_URL` | Coolhand-shaped feedback endpoint for `coolhand` mode. Overwritten automatically to the signed-in entry point's `feedbackUrl` on OAuth login (see below) — only set this directly for a static-`coolhandApiKey` deployment with no OAuth. |
| `coolhandApiKey` | `VITE_COOLHAND_API_KEY` | API-key alternative for Coolhand submissions (`X-API-Key`) |
| `creatorId` | `VITE_CREATOR_ID` | **Optional hardcoded `creator_unique_id`.** Without it, the signed-in identity (or `demo-captain`) is used. Coolhand can reconcile creators later, so leaving this unset is fine. |
| `demo` | `VITE_DEMO` | Force demo on/off |

Copy `public/config.json.example` to `config.json` in the deployed directory to get started.

## Entry points (`entry-points.json`)

The buttons on the Landing page — "Try Demo" and any OAuth/SSO sign-in options — are sourced from
a separate runtime file, `entry-points.json`, served next to `index.html` the same way as
`config.json` (optional; a 404 falls back to the code-shipped defaults: Try Demo + Sign in with
Coolhand, the latter unconfigured until you give it a `clientId`). Copy
`public/entry-points.json.example` to get started.

```json
{
  "entryPoints": [
    { "type": "demo" },
    {
      "type": "oauth",
      "id": "coolhand",
      "label": "Sign in with Coolhand",
      "authorizeUrl": "https://coolhandlabs.com/oauth/authorize",
      "tokenUrl": "https://coolhandlabs.com/oauth/token",
      "clientId": "your-registered-coolhand-client-id",
      "scope": "captain",
      "reviewQueueUrl": "https://coolhandlabs.com/captain/review-queue",
      "feedbackUrl": "https://coolhandlabs.com/api/v2/llm_request_log_feedbacks"
    }
  ]
}
```

Each `oauth` entry is a **full independent backend connection**, not just an alternate identity
source: signing in against one runs a standard OAuth2 authorization-code+PKCE flow against its
`authorizeUrl`/`tokenUrl`, and the resulting bearer token is then used directly against that
entry's own `reviewQueueUrl`/`feedbackUrl`. This isn't Coolhand-specific — any backend
implementing the same Doorkeeper-style OAuth2+PKCE contract (public client, `S256` PKCE, standard
`authorization_code`/`refresh_token` grants) can be listed as its own entry alongside or instead
of Coolhand's.

Order in the array is display order. Omitting `{type: "demo"}` removes the Try Demo button
entirely; omitting the Coolhand entry (or replacing the whole array) removes Coolhand as a
sign-in option — there is no hidden fallback to it.

**Registering an OAuth provider's `client_id` — redirect_uri must match exactly.** For Coolhand,
the backend's `captainslog:register_oauth_client` rake task defaults `CAPTAINSLOG_REDIRECT_URIS`
to a path-shaped URL (`http://localhost:5173/callback`). captainslog has **no dedicated
`/callback` route** — it's a hash-router SPA; the OAuth callback is handled procedurally at boot
from `?code=&state=` query params on the app's own root URL. Whoever registers the OAuth
application (Coolhand's or any other backend's) for a real deployment **must** register a
`redirect_uri` equal to the deployed app's actual root URL (e.g. `https://captainslog.example.com/`),
not a `/callback`-shaped path — OAuth2 requires an **exact** match between the registered
`redirect_uri`, the `/oauth/authorize` request, and the `/oauth/token` exchange, or the flow fails.

## Recipes

### Mode 2 — Coolhand, batteries included

```json
{ "mode": "coolhand", "demo": false }
```

Configure the Coolhand entry's `clientId` in `entry-points.json` (see above). Users click **Sign
in with Coolhand**; queue reads and feedback writes carry their bearer token. No custom backend
needed.

### Mode 1 — self-hosted

```json
{
  "mode": "self_hosted",
  "demo": false,
  "reviewQueueUrl": "https://your-backend.example.com/captain/review-queue",
  "feedbackUrl": "https://your-backend.example.com/captain/review-queue"
}
```

Your backend implements the two endpoints in [API.md](API.md) — reproduce the names and shapes verbatim and captainslog is drop-in. Captains authenticate with the **Custom backend** option (API key or bearer; you validate it).

### Both — self-hosted queue, feedback to both

```json
{
  "mode": "both",
  "demo": false,
  "reviewQueueUrl": "https://your-backend.example.com/captain/review-queue",
  "feedbackUrl": "https://your-backend.example.com/captain/review-queue",
  "coolhandApiKey": "ch_..."
}
```

The same captain feedback goes to your backend (single PRD-shaped POST) **and** to Coolhand (decomposed to today's wire format — see API.md "Coolhand decomposition").

## Secrets & storage

- OAuth tokens / custom credentials live in `sessionStorage` (or `localStorage` with "Remember me"). **Sign out** clears both.
- Nothing else is persisted; session state is in-memory, plus a timer snapshot in `sessionStorage`.
- A `coolhandApiKey` in `config.json` is visible to anyone who can load the page — prefer OAuth for multi-user deployments and keys only for single-operator/internal setups.

## Dev-mode OAuth mock

`npm run dev` serves `/mock-oauth/authorize` and `/mock-oauth/token`. Any `entry-points.json`
oauth entry with no `clientId` configured runs its full authorization-code + PKCE flow against
this mock in dev — it's provider-agnostic, so multiple unconfigured entries can share it. This
lets the whole path be exercised locally before an entry's real backend/`clientId` is ready.
