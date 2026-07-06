# captainslog API contracts

captainslog talks to exactly one endpoint family: a **review-queue read** and a **feedback write**. Self-hosted backends should reproduce these endpoint names and shapes **verbatim** so captainslog is drop-in interchangeable with the Coolhand-backed deployment.

The Coolhand-side implementations are tracked in [`docs/coolhand-issues/`](docs/coolhand-issues/).

## 1. Review-queue read

```
GET /captain/review-queue
```

**Auth:** `Authorization: Bearer <token>` (OAuth) or `X-API-Key: <key>`, per deployment.

**Query parameters**

| Param | Type | Notes |
|---|---|---|
| `time_window_start` | ISO 8601 | Start of review window |
| `time_window_end` | ISO 8601 | End of review window |
| `creator_unique_id` | string | The captain; used for dedup |
| `exclude_reviewed_by_creator` | boolean | Exclude items this creator already reviewed |
| `workloads[]` | string, repeated | Optional filter by workload id |
| `limit` | int | Page size |
| `offset` | int | Pagination offset |

**Response**

```json
{
  "items": [
    {
      "id": "llm_request_log_abc123",
      "workload_id": "engineering-report-generation",
      "workload_name": "Engineering Report Generation",
      "original_output": "# Warp Core Status\n\n## Summary ...",
      "prompt": "Draft an engineering report from the following telemetry ...",
      "input_data": { "system": "warp_core", "readings": [] },
      "created_at": "2026-07-06T14:30:00Z",
      "already_reviewed_by_creator": false
    }
  ],
  "total_count": 347,
  "has_more": true,
  "next_offset": 100
}
```

Notes:
- `original_output` is **Markdown**; captainslog renders it to sanitized HTML.
- `prompt` and `input_data` are shown collapsed, reference-only.
- **Bias prevention:** captainslog rebuilds every item from a field whitelist. Model, provider, token counts, temperature, or any other metadata a backend returns are structurally dropped before rendering — do not rely on them being shown.
- **Dedup:** captainslog passes `creator_unique_id` + `exclude_reviewed_by_creator=true`, *and* client-side-drops any item flagged `already_reviewed_by_creator`. Backends may pre-filter, hint, or both.

### 1b. Workload listing (for the sampling UI)

```
GET /captain/review-queue/workloads?time_window_start=...&time_window_end=...
```

```json
[
  { "id": "engineering-report-generation", "name": "Engineering Report Generation", "pending_count": 42, "experimental": false }
]
```

`experimental` drives the "Priority to Experimental" sampling preset. **Optional:** if this endpoint is absent, captainslog falls back to deriving workload names/counts from the first pages of the review queue (bounded, best-effort).

## 2. Feedback write

```
POST /captain/review-queue/{id}/feedback
```

The body is **identical to Coolhand's `POST /llm_request_log_feedbacks` schema**:

```json
{
  "llm_request_log_id": "llm_request_log_abc123",
  "creator_unique_id": "captain-jean-luc",
  "creator_type": "human",
  "sentiment": "like",
  "revised_output": "# Warp Core Status\n\n## Summary (with captain edits) ...",
  "explanation": "Solid overall.",
  "feedback_partials": [
    {
      "focus_range": { "start": 150, "end": 200 },
      "focus_section": "Recommendations",
      "sentiment": "dislike",
      "explanation": "Needs a citation for the dilithium figure."
    }
  ]
}
```

- `sentiment` ∈ `like | neutral | dislike` (`neutral` = alignment nudge, not an error).
- `creator_type` is `human` for captain feedback (agent/auto-tuner feedback can coexist later).
- `feedback_partials[]` are section annotations; `focus_range` holds character offsets, `focus_section` the selected text.
- `revised_output` is the full edited version.

**Response:** `{ "id": "feedback_xyz789", "status": "success" }` (any 2xx is treated as success).

> ⚠️ **focus_range offset semantics:** offsets are measured against the **rendered plain text** of the output (the DOM `textContent` after Markdown → HTML), *not* the raw Markdown source. This follows the coolhand-js selection primitive. `focus_section` (the literal selected text) is always included and is the reliable anchor; treat `focus_range` as a hint.

### 2b. Coolhand decomposition (what `coolhand` / `both` mode actually sends today)

Coolhand's **current** production endpoint (`POST https://coolhandlabs.com/api/v2/llm_request_log_feedbacks`) does not yet accept an aggregated `feedback_partials[]` array (tracked in `docs/coolhand-issues/03`). Until it does, captainslog decomposes each submission into today's real wire format — one main record plus one record per partial, each wrapped in `llm_request_log_feedback`:

```json
{
  "llm_request_log_feedback": {
    "sentiment": "dislike",
    "original_output": "...",
    "focus_range": { "start": 150, "end": 200 },
    "focus_section": "Recommendations",
    "explanation": "Needs a citation.",
    "workload_hashid": "engineering-report-generation",
    "creator_unique_id": "captain-jean-luc",
    "creator_type": "human",
    "collector": "captainslog-0.1.0"
  }
}
```

Records are sent sequentially, fail-fast, with idempotent resume on retry (already-delivered records are not re-sent). Matching uses `llm_request_log_id` when the item id is a numeric Coolhand log id, otherwise `original_output` fuzzy matching.

## 3. OAuth (Coolhand)

Authorization-code + PKCE for a public SPA client (no secret):

```
GET  /oauth/authorize?response_type=code&client_id=...&redirect_uri=...&state=...&code_challenge=...&code_challenge_method=S256&scope=captain
POST /oauth/token   (application/x-www-form-urlencoded)
      grant_type=authorization_code&code=...&code_verifier=...&redirect_uri=...&client_id=...
      grant_type=refresh_token&refresh_token=...&client_id=...
```

Token response: `{ "access_token", "refresh_token", "token_type": "Bearer", "expires_in" }`. captainslog silently refreshes at ~80% of `expires_in` and signs the captain out (re-prompt) if refresh fails. The resulting bearer token must be accepted by both endpoints above.

## 4. What feedback does — and doesn't — do

Feedback captured by captainslog is for **improving the process** (prompt tuning, evaluations). Applying a captain's `revised_output` to the source document, re-running a pipeline, or any downstream action is the operator's responsibility — wire your own handler to endpoint 2's data if you want captured edits to go anywhere beyond analysis.
