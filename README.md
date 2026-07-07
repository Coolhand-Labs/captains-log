# captainslog

**Control plane for AI process review.** captainslog turns AI-output review from tedious button-pushing into a gamified, time-boxed workflow: move your best operators off turn-by-turn babysitting and onto reviewing **final outputs** — 1–2 hours a day, one item at a time, with rich feedback (edits, section-level annotations, sentiment) that closes the loop and improves the process.

It is the practical implementation of the *captain strategy* from **The Everything Engineer**.

## Try it in 10 seconds (demo mode)

```bash
npm install
npm run dev
```

Open the printed URL and hit **Play Demo**. The demo is a starship captain reviewing AI-generated Starfleet reports — in-memory dummy data, no account, **zero network calls** (check the network tab). It exercises the entire flow: configuration → sampling → the review game → the reward screen.

## The flow

1. **Configure** — pick a review window (last 4h/24h/7d/custom), a time box (20 min / 1 h / 2 h), and sampling: Quick Start (uniform random, capped to your time box) or per-workload rates with presets (*Balance Across All*, *Priority to Experimental*) and a live projection.
2. **Review** — one item at a time. The AI output (Markdown) is front and center; the prompt and input data are one click away (each independently). **Annotate** mode: select any passage to attach a comment + sentiment to that span. **Edit** mode: revise the output directly. Overall sentiment (👍 😐 👎) and an optional explanation round out the package. **Submit & Next** sends everything atomically; **Skip** sends nothing. Model, provider, and token metadata are never shown — by design, so reviews stay unbiased.
3. **Reward** — hit your time target (or empty the queue) and get a starfield, session stats (sentiment breakdown, edits, annotations), and the offer to keep going if fresh items arrived mid-session.

> **Important:** submitting feedback sends your edits/annotations/sentiment to the configured endpoint(s) so future prompts and evaluations can improve. It does **not** modify the original document or act on the underlying system. Until you wire up your own handler for the captured feedback, captainslog is only *capturing* — not changing anything downstream.

## Three auth paths · three data modes

**Auth** (all always offered):

| Path | What it is |
|---|---|
| **Demo / none** | Instant, in-memory, no credentials. |
| **Coolhand OAuth** | Sign in with Coolhand; queue reads and feedback writes carry your bearer token. |
| **Custom backend** | An API key or bearer token for your own backend. |

**Data modes** (`mode` in config):

| Mode | Reads queue from | Writes feedback to |
|---|---|---|
| `coolhand` | Coolhand review-queue endpoint | Coolhand feedback endpoint |
| `self_hosted` | Your backend | Your backend |
| `both` | Configurable | **Both** endpoints |

The feedback payload is **identical to Coolhand's `POST /llm_request_log_feedbacks` schema**, so self-hosted and Coolhand-backed deployments are interchangeable — `both` mode simply POSTs the same body twice. See [API.md](API.md) for the exact contracts a self-hosted backend implements (reproduce the endpoint names and shapes verbatim and captainslog is drop-in), and [CONFIGURATION.md](CONFIGURATION.md) for deployment setup.

## UI: shadcn design system via Basecoat

The UX is standardized on the [shadcn/ui](https://ui.shadcn.com) design system through [Basecoat](https://basecoatui.com) — shadcn's components as framework-agnostic Tailwind CSS, so the app stays Preact + signals with no React/Radix runtime. Components use Basecoat classes (`btn`, `card`, `input`, `dialog`, `toaster`, …); the Star Trek look is just shadcn CSS variables in `src/theme/trek.css`, so any shadcn-compatible theme (ui.shadcn.com/themes, tweakcn) is a drop-in reskin.

## Built on coolhand-js

captainslog is a thin orchestration layer over [coolhand-js](https://github.com/Coolhand-Labs/coolhand-js) primitives: passive edit capture (`revised_output`), highlight-and-annotate section feedback (`focus_range`/`focus_section`), and sentiment. New generally-useful UI built here should be upstreamed — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

```bash
npm run dev        # dev server (with mock OAuth endpoints)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm test           # vitest (unit + integration + a11y)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

The build is a static bundle (`dist/`) hostable anywhere — S3, GitHub Pages, Vercel, a `file://` URL.

## License

Apache-2.0
