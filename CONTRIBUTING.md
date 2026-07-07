# Contributing to captainslog

## Setup

captainslog consumes **coolhand-js from a local checkout** (`file:` dependency on `../sdks/coolhand-js`, npm package name `coolhand`) until the partial-feedback release is published to npm. Before `npm install` here — and after any coolhand-js change — build it:

```bash
cd ../sdks/coolhand-js && npm ci && npm run build
cd ../../captainslog && npm install
```

Verify before committing: `npm run typecheck && npm run lint && npm test && npm run build`.

## The upstream directive (important)

captainslog must stay a **thin orchestration layer** over [coolhand-js](https://github.com/Coolhand-Labs/coolhand-js) primitives — passive edit capture, highlight-and-annotate partial feedback, sentiment. Do not reimplement feedback UI here.

Any new, generally-useful component that is **not captainslog-specific** is a candidate for coolhand-js. When you build one:

1. Flag it with a `// coolhand-js candidate:` comment and call it out in the PR description.
2. Where it makes sense, open a PR against `Coolhand-Labs/coolhand-js` to upstream it rather than letting it live only here.

Current candidates:
- **Serialized single-output review card** (`src/components/OutputPanel.tsx` + `SessionHeader.tsx`) — the one-at-a-time review surface.
- **Time-boxed progress tracker** (`src/state/timer.ts` + the header timer UI).
- **`apiUrl` init option for coolhand-js** — the SDK hardcodes its endpoint (`src/constants.ts`); captainslog mirrors that string to intercept widget traffic (`src/services/feedback-transport.ts`). A configurable `apiUrl` upstream removes that fragility.
- **UMD export mismatch fix** — coolhand-js builds with webpack `export: 'default'`, so the named exports declared in its `index.d.ts` are `undefined` at runtime. Either export the namespace or trim the declared surface.

## Architectural invariants

- **Only the coolhand default singleton is real.** `import coolhand from 'coolhand'` — never value-import named exports (an ESLint rule enforces this).
- **Widgets never reach the network.** All widget traffic is intercepted by `feedback-transport.ts` into per-item drafts; real submission happens only in `feedback-encoder.ts` on Submit & Next. Demo mode must stay zero-network.
- **Bias prevention is structural.** Items pass through `sanitizeItem()`'s whitelist; model/provider/token/temperature fields must never gain a rendering path.
- **Theme is flavor only.** All Star Trek copy lives behind the `Theme` interface (`src/theme/`); screens must not hardcode it. Visuals are the shadcn design system via Basecoat — palette changes belong in `src/theme/trek.css` (shadcn CSS variables), not in component markup.
- **WCAG 2.1 AA.** Every interactive element keyboard-reachable, axe tests green (`npm test`), `prefers-reduced-motion` respected.
