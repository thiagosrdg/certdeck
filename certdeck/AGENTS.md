# AGENTS.md

Context for AI coding agents working on this repository. Read this before
making any change. It is the source of truth for project decisions; if
something here conflicts with an assumption you are about to make, this file
wins. Keep it updated when a decision changes.

## What this project is

**CertDeck** — a monorepo of offline-first exam simulators for IT
certifications, built around a card-game metaphor: a certification is a deck,
a question is a card, a domain is a suit. One shared engine, one app per
certification.

- `apps/network-plus` — **PacketPrep**, CompTIA Network+ (N10-009). Active.
- A CompTIA Security+ (SY0-701) app is planned and must require no engine
  rewrite.

These are personal study tools for a single user, not a product. The owner is
a Computer Science student preparing for Network+, with Security+ next.

## Non-negotiable constraints

1. **Fully offline at runtime.** No network calls, ever. No CDN fonts, no
   analytics, no external APIs, no telemetry. Fonts are self-hosted. If a
   feature needs the network, it does not belong here.
2. **No backend, no accounts.** All state in `localStorage`, namespaced per
   certification so installed apps never collide.
3. **PWA only.** Installable from GitHub Pages. No Capacitor, no native
   wrapper, no APK. Decided explicitly — do not reintroduce it.
4. **Public repository.** Never commit secrets, tokens, or personal data.
5. **English everywhere.** Code, comments, commit messages, docs, UI copy.
   (The owner communicates in Portuguese; the repository is English.)

## The architectural rule that matters most

**`packages/engine` must contain nothing specific to any certification.**

No hardcoded domain names, no hardcoded question counts, no exam-code
strings. Everything certification-specific lives in the app's
`cert.config.ts` and its question files.

Before finishing any engine change, grep for `N10`, `Network+`, `SY0`,
`Security+`, and domain names. A hit in the engine is a bug.

Test of the architecture: adding a certification should mean a new
`apps/<name>/` folder with a config and question files, plus an entry in the
build matrix and the landing page. Nothing else.

### Engine owns
Question schema (TypeScript + Zod), weighted exam generation driven by
config, scoring including multi-answer, attempt persistence, timer, question
navigator, results calculation, shared UI primitives, design tokens.

### Each app owns
`cert.config.ts` (including its domains' suit marks and hues), its question
JSON, its PWA manifest and icons, its `base` path, its accent colour.

## Structure

The repository is an umbrella that may hold other, unrelated projects, so
CertDeck lives one level down in `certdeck/`. Only what GitHub requires at
the root stays there.

```
<repo root>/
├── .github/workflows/   # Actions only runs workflows from the root
├── LICENSE, .gitignore
├── README.md            # index of the repo's projects
└── certdeck/            # ← this project; all npm commands run from here
    ├── README.md        # authoritative, keep current
    ├── AGENTS.md        # this file
    ├── landing/         # static index of available simulators
    ├── packages/engine/ # certification-agnostic logic and UI
    └── apps/
        └── network-plus/    # PacketPrep
            ├── src/cert.config.ts
            └── src/data/questions/
```

npm workspaces. Root scripts: `dev`, `build`, `test`, `validate`.

Two things follow from the nesting. The workflow runs its build jobs with
`working-directory: certdeck`, but `upload-artifact` paths resolve against
the repo root and so keep the `certdeck/` prefix. Git hooks always run from
the repo root, so `prepare` is `cd .. && husky certdeck/.husky` and the
pre-commit hook enters `certdeck/` before validating.

## Tech stack

Vite · React · TypeScript · Tailwind CSS · Zustand · Zod · Vitest ·
vite-plugin-pwa. No UI component library — components are hand-built.

## CertConfig

Each app exports a config satisfying the engine's `CertConfig` type:
certification id, app name, cert name, exam code, `questionsPerExam`,
`timeLimitMinutes`, `passThreshold`, and the domain list with weights and
per-exam counts.

Network+ (N10-009), the official weightings and the count for a 90-question
exam:

| Domain | Name | Weight | Count |
|---|---|---|---|
| 1.0 | Networking Concepts | 23% | 21 |
| 2.0 | Network Implementation | 20% | 18 |
| 3.0 | Network Operations | 19% | 17 |
| 4.0 | Network Security | 14% | 13 |
| 5.0 | Network Troubleshooting | 24% | 21 |

Exam generation respects this distribution — never 90 random questions. If a
domain lacks enough questions, fill from the nearest domains and warn in the
UI.

## Question schema

Questions are data, never code. They live as JSON in
`apps/<app>/src/data/questions/`, loaded via `import.meta.glob`. Adding a
file must never require a code change. Never hardcode a question in a
component. See the README for a commented example.

| Field | Notes |
|---|---|
| `id` | Unique within the certification |
| `domain` | Must match a domain id in that app's config |
| `domainName` | Human-readable domain name |
| `objective` | Official objective number, e.g. `"1.1"` |
| `type` | `"single"` or `"multiple"` (checkboxes when multiple) |
| `difficulty` | `"easy" \| "medium" \| "hard"` |
| `stem` | Question text |
| `options` | Array of `{ id, text }` |
| `correct` | Array of option ids |
| `explanation` | Why the correct answer is correct |
| `distractorExplanations` | One entry for **every** incorrect option |
| `tags` | Free-form topic tags |

All data validated with Zod at load. A malformed file must produce a clear,
visible error, not a blank screen.

## Modes

- **Full exam** — `questionsPerExam` questions, timer, no feedback until
  submit, flagging plus a navigator grid.
- **Practice by domain** — selected domains, immediate feedback.
- **Random question** — single question, immediate feedback.
- **Review** — walk a finished attempt with full explanations.

Results show overall score, pass/fail against `passThreshold`, per-domain
breakdown, time taken, and the weakest domain called out as the next study
focus.

**Explanations are the product.** These apps exist for understanding, not
scoring. Feedback and results screens treat explanations as primary content.

## GitHub Pages specifics

One Pages project site at `https://<user>.github.io/certdeck/`. Each app on
its own subpath. Three things depend on this and break silently if changed:

- Vite `base` is `/certdeck/<app-name>/` in production, `/` in dev.
- Each app's PWA `scope` and `start_url` must match its own subpath, or the
  installed app opens to a 404. Scopes must not collide between apps.
- Pages has no SPA rewrite, so deep links 404. The chosen approach is
  documented in `docs/design.md` — do not switch routers without updating it.

Deploy is one GitHub Actions workflow on push to `main`: build each app into
`dist/<app-name>/`, the landing page into `dist/`, then `actions/deploy-pages`.
Adding an app means adding to the matrix, not rewriting the workflow.

Service worker auto-updates with a non-blocking prompt, so a stale cache
never hides newly added questions.

## Design direction — card game

The identity is a **card game**, and it is central, not cosmetic. Palette,
type, card anatomy, and the suit system live in `docs/design.md` — read it
before touching UI.

The metaphor maps onto real structure:

- A question is a **card** — the hero of the screen, with card proportions
  and a defined edge, not a full-bleed panel.
- An exam is a **deck** being played through; progress reads as cards
  remaining.
- The five domains are **suits**, each with a suit mark and hue supplied by
  the app's `cert.config.ts` — drawn from network/signal iconography, not
  hearts and spades.
- Difficulty is the card's **rank**, small, in a corner.
- The navigator is a **spread** of face-down cards showing suit and state.
- A flagged question is a **marked card**.

Reference a modern collectible card game or a finely printed tarot deck.
Explicitly avoid casino cliché: no felt green, no neon, no chips, no
playing-card kitsch.

### Card flip animation

The signature interaction. Advancing flips the current card to reveal the
next; in practice modes, revealing feedback flips the card to its reverse
face, where the explanation lives.

- Real 3D transform (`preserve-3d`, `rotateY`/`rotateX`,
  `backface-visibility: hidden`), not a crossfade. ~300ms, settling easing,
  no bounce. It runs up to 90 times per exam.
- Direction carries meaning: forward and back flip opposite ways.
- Animate only `transform` and `opacity`, only on the card. Never layout
  properties.

Non-negotiable:

- `prefers-reduced-motion: reduce` replaces the flip with an instant swap or
  a very short fade. No exceptions.
- Rapid navigation never queues or stutters — cancel a running flip and jump
  to the new card.
- The animation never blocks input.
- Question text stays in the accessible tree and is announced on change via a
  live region, regardless of the transform. No focus trapping mid-flip.
- A settings toggle disables the flip entirely.

### Tokens and type

- Design tokens and the card component live in the engine so future apps
  inherit the identity; each app supplies its own accent and suit marks so its
  deck is recognisably different.
- Monospace for question metadata, command output in stems, and the timer.
  Not for body text.
- State (answered / unanswered / flagged / correct / incorrect) is signalled
  by colour **plus** shape or icon, never colour alone.
- Feedback is calm. The flip is the moment of drama — no confetti or emoji
  praise on top of it.
- Beyond the flip and deliberate state changes, no ambient motion.

## Quality floor

- Keyboard navigable: number keys select options, arrows move between
  questions, Enter submits. Shortcuts documented in the UI.
- Visible focus states, `prefers-reduced-motion` respected, WCAG AA contrast.
- Mobile-first, comfortable in portrait — phone and tablet are the primary
  study devices.

## Commands

```bash
npm run dev        # dev servers
npm run build      # build all workspaces
npm run validate   # validate all question files
npm run test       # unit tests
```

`npm run validate` checks schema validity, id uniqueness within a
certification, complete distractor explanations, that every `domain` exists
in that app's config, and per-domain counts. Runs in a pre-commit hook.

## Testing expectations

At minimum: weighted exam generation against a config, scoring including
multi-answer questions, and the persistence layer's per-certification
namespacing.

## Working style

- Propose structure and plan before large changes; wait for approval.
- Small, descriptive commits.
- Run the app and tests as you go.
- Update this file and the README when a decision or convention changes.
