# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

captainslog — a frontend-only SPA (Preact + Vite + TypeScript, `@preact/signals` state, hand-rolled hash router) that gamifies time-boxed human review of AI outputs. Feedback capture reuses **coolhand-js** widgets; see README.md and API.md for product and contract details.

## Setup

The `coolhand` dependency is a `file:` symlink to `../sdks/coolhand-js` and ships a prebuilt UMD bundle. If `dist/coolhand.js` there is missing or stale:

```bash
cd ../sdks/coolhand-js && npm ci && npm run build
```

## Verify before committing

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Tests are **Vitest** (jsdom + @testing-library/preact + vitest-axe) — a deliberate deviation from the sibling packages' Jest convention because it shares Vite's transform pipeline. If you start a dev/preview server, terminate it when done.

## Load-bearing facts (violating these breaks the app subtly)

1. **coolhand UMD exposes ONLY its default export** (webpack `export: 'default'`). Named exports in its `.d.ts` are `undefined` at runtime. Use `import coolhand from 'coolhand'` and `import type {...}` only — an ESLint `no-restricted-imports` rule guards this.
2. **`feedback-transport.ts` intercepts `window.fetch`** for the Coolhand feedback URL (mirrored in `src/config/constants.ts`, pinned to `coolhand-js/src/constants.ts`). Widget traffic becomes local drafts and is never forwarded; real submission is `feedback-encoder.ts` via `realFetch()`. Never "fix" the encoder to use plain `fetch` for the Coolhand URL — the transport would swallow it.
3. **One element can't host both coolhand primitives**: partial feedback refuses input/textarea; edit capture requires input/textarea. Hence the Review screen's Annotate/Edit toggle (`OutputPanel.tsx`), with highlights preserved across toggles via the `data-coolhand-partial-feedbacks` attribute.
4. **`sanitizeItem()` whitelist** (`src/services/sanitize.ts`) is the bias-prevention boundary — model/provider/token/temperature fields must never reach the UI.
5. **Demo mode is zero-network.** Any change that makes the demo hit the network is a bug.
6. Captured main-widget traffic sets only `revised_output`/`explanation` on drafts — overall sentiment is owned by captainslog's native buttons (the widget's `like` defaults to `null`, which would misread as "neutral").

## Layout

- `src/services/` — transport, encoder, coolhand adapter, sampling, sanitize, api-client, auth/, demo/
- `src/state/` — session (queue/drafts/submissions), timer, stats signals
- `src/screens/` — Landing, AuthModal, Configure, Review, Reward
- `src/theme/` — ALL Star Trek flavor copy (swap point)
- `docs/coolhand-issues/` — drafts of the five Coolhand backend dependencies
