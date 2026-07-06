# Configuring captainslog

captainslog is a static frontend. Configuration merges three layers, later wins:

1. **Defaults** — demo mode, Coolhand endpoint URLs.
2. **Build-time env vars** — `VITE_*` variables baked in by `npm run build`.
3. **Runtime `config.json`** — a JSON file served next to `index.html`; edit without rebuilding.

If `demo` resolves to `true` (the default), captainslog forces demo mode regardless of other settings.

## Keys

| config.json key | Env var | Meaning |
|---|---|---|
| `mode` | `VITE_MODE` | `demo` \| `coolhand` \| `self_hosted` \| `both` |
| `reviewQueueUrl` | `VITE_REVIEW_QUEUE_URL` | Review-queue endpoint (defaults to Coolhand's `/captain/review-queue`) |
| `feedbackUrl` | `VITE_FEEDBACK_URL` | Self-hosted feedback base; captainslog POSTs to `{feedbackUrl}/{id}/feedback` |
| `coolhandOauthClientId` | `VITE_COOLHAND_OAUTH_CLIENT_ID` | OAuth client id for "Sign in with Coolhand" |
| `coolhandApiKey` | `VITE_COOLHAND_API_KEY` | API-key alternative for Coolhand submissions (`X-API-Key`) |
| `creatorId` | `VITE_CREATOR_ID` | **Optional hardcoded `creator_unique_id`.** Without it, the signed-in identity (or `demo-captain`) is used. Coolhand can reconcile creators later, so leaving this unset is fine. |
| `demo` | `VITE_DEMO` | Force demo on/off |

Copy `public/config.json.example` to `config.json` in the deployed directory to get started.

## Recipes

### Mode 2 — Coolhand, batteries included

```json
{ "mode": "coolhand", "demo": false, "coolhandOauthClientId": "your-client-id" }
```

Users click **Sign in with Coolhand**; queue reads and feedback writes carry their bearer token. No custom backend needed.

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

`npm run dev` serves `/mock-oauth/authorize` and `/mock-oauth/token`. When no `coolhandOauthClientId` is configured in dev, "Sign in with Coolhand" runs the full authorization-code + PKCE flow against the mock, so the whole path is exercisable before Coolhand's OAuth ships.
