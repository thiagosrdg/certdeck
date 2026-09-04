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

- `apps/network-plus` — the CompTIA Network+ (N10-009) deck. Active, and it
  carries the **CertDeck** name in the UI: wordmark, page title and installed
  PWA. Its folder and its `cert.config.ts` `id` stay `network-plus` — the id
  namespaces localStorage, so renaming it would orphan a user's progress.
  When a second certification ships, that app needs a name of its own, or
  this convention needs revisiting: two decks cannot both be "CertDeck".
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

Styling is Tailwind 4, so the shared theme is CSS, not a JS preset. An app's
stylesheet starts with `@import "tailwindcss"` followed by
`@import "@certdeck/engine/theme.css"`, and needs an
`@source "<relative path>/packages/engine/src"` line because Tailwind's
automatic source detection does not reach outside the app's own folder. The
theme's colours forward to the `--cd-*` custom properties in `tokens.css`,
which is what keeps light, dark and each app's accent switching at runtime —
define new colours that way rather than as literals.

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
        └── network-plus/    # the Network+ deck
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

**Option order in a file is the order a user sees when shuffling is off.**
`withDisplayOptions` returns the question untouched when the shuffle setting
is disabled, so a bank that always lists the correct answer first hands the
answer away to anyone who turns that setting off. The bank was written that
way and has been permuted; keep new questions varied, and do not assume the
shuffle will cover for it.

Questions are data, never code. They live as JSON in
`apps/<app>/src/data/questions/`, loaded via `import.meta.glob`. Adding a
file must never require a code change. Never hardcode a question in a
component. See the README for a commented example.

| Field | Notes |
|---|---|
| `id` | Unique within the certification |
| `domain` | Must match a domain id in that app's config |
| `domainName` | Human-readable domain name |
| `objective` | Official objective number, e.g. `"1.1"`; must be one the domain lists in the config |
| `type` | `"single"` or `"multiple"` (checkboxes when multiple). A `multiple` question needs at least two `correct` ids and is graded on the exact set — no partial credit, matching how CompTIA grades "choose two" items |
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

- **Full exam** — `questionsPerExam` questions, timer, flagging plus a
  navigator grid. A setup screen first asks how the deck is played, and the
  answer is stored on the attempt as `feedbackMode`, so it survives a reload
  and a resumed exam keeps the rules it started under:
  - `deferred` — exam conditions. Nothing is graded until submit, and
    answers stay editable while moving between questions.
  - `immediate` — each card is checked as it is played, revealing the answer
    and its explanation; once checked an answer is locked. Still timed and
    still scored, so it lands in history and stats like any other attempt.

  An exam can be **paused**: `pause()` flushes the clock and drops the
  attempt from memory while leaving it in storage as in-progress, so the home
  screen offers it back with its card, its answered count and its remaining
  time. `currentIndex` is persisted on the attempt for this — resuming lands
  on the card it was left on, not back at card one. The countdown stops
  because the exam screen unmounts, which is the intended behaviour and is
  covered by tests: this is a study tool, not a proctored room, and a
  90-card deck has to survive being walked away from.
- **Practice by domain** — selected domains, immediate feedback.
- **Random question** — single question, immediate feedback.
- **Review** — walk a finished attempt with full explanations.

- **Statistics** — everything in history aggregated: mastery per domain,
  accuracy by rank and by objective, deck coverage, XP, level and study
  streak.

Results show overall score, pass/fail against `passThreshold`, per-domain
breakdown, time taken, the weakest domain called out as the next study
focus, XP earned, accuracy by rank, and the change against the previous
attempt in the same mode.

**A field added to a persisted schema needs a `.default()`.** `loadHistory`
validates the whole array and returns `[]` when the parse fails, so a
required new field would make every attempt already in localStorage vanish
without a word. `feedbackMode` is defaulted for exactly this reason, and
there is a test that pins it.

**Nothing the user must be able to finish may depend on a native dialog.**
`window.confirm` returns false with no signal in a browser that has
suppressed dialogs, which once made submitting a finished exam do nothing at
all. Use the engine's `ConfirmDialog`.

### Accent

Users pick the accent from `ACCENTS` in the engine; `null` in settings means
the app's own `cert.config` colour. The rules a new colour must satisfy, and
why each exists, are in `docs/design.md` and enforced by `accents.test.ts` —
add a colour there and the tests will tell you whether it is allowed.

### Progression

`computeStudyStats` in the engine owns XP, levels, mastery tiers and
streaks, driven entirely by the config and the question bank. Its rules are
deliberate and tested: a skipped question is not a wrong answer, a tier
needs volume as well as accuracy, harder questions are worth more XP, a
streak survives a day not yet studied and breaks only on one that was
missed, and a question needs review by its most recent outcome rather than
its worst. Change one of those and a test should fail.

**Explanations are the product.** These apps exist for understanding, not
scoring. Feedback and results screens treat explanations as primary content.

## GitHub Pages specifics

One Pages project site at `https://<user>.github.io/certdeck/`. Each app on
its own subpath.

The repository is named `certdeck`, lowercase, and that is load-bearing: the
repo name is the first path segment of every Pages URL, and Pages serves that
segment case-sensitively. Renaming the repo, or capitalising it, breaks every
built asset path and orphans installed PWAs (`scope` and `id` are the app's
identity). Keep the name, the Vite `base` and the docs below in agreement.

Three things depend on this and break silently if changed:

- Vite `base` is `/certdeck/<app-name>/` in production, `/` in dev.
- Each app's PWA `scope` and `start_url` must match its own subpath, or the
  installed app opens to a 404. Scopes must not collide between apps.
- Pages has no SPA rewrite, so deep links 404. The chosen approach is
  documented in `docs/design.md` — do not switch routers without updating it.

One GitHub Actions workflow covers both CI and deploy. A push to `main` runs
`check` and builds each app into `dist/<app-name>/` and the landing page into
`dist/`. The final `actions/deploy-pages` job is gated on `workflow_dispatch`,
because publishing is a deliberate one-off at the end of development rather
than something every push does. Adding an app means adding to the matrix, not
rewriting the workflow.

The service worker precaches the app and every question file, so the app
works offline after the first load.

A waiting build is announced by `UpdateWatcher`, which each app mounts once
outside the router. It calls `useRegisterSW` from `virtual:pwa-register` and
renders the engine's `UpdateBanner`; confirming calls
`updateServiceWorker(true)`, which sends the `SKIP_WAITING` the generated
worker waits for and reloads into the new build.

The split is deliberate: the virtual module comes from vite-plugin-pwa,
configured per app, and the landing page has no worker at all — so the
registration lives in the app and only the banner is shared. Without that
registration the worker still installs, but nothing ever sends
`SKIP_WAITING`, and a new build sits unused until every window of the old one
closes. That was the behaviour until it was fixed, and it is what would let a
stale cache hide newly added questions.

The banner is non-blocking on purpose: it can appear mid-exam, and an update
is never more urgent than the question on screen. Dismissing it is a real
choice — the new version still arrives on a later launch.

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
certification, complete distractor explanations, that every `domain` and
every `objective` exists in that app's config, and per-domain counts. Runs
in a pre-commit hook.

Each domain in `cert.config.ts` lists its `objectives`. This is what makes
the objective check possible, and it exists because it was missing: five
questions carried objective `4.4`, which N10-009 does not have, and nothing
caught it — the config had no objective list to check against. A domain with
an empty `objectives` array opts out, so a new app is not blocked before its
objectives are transcribed.

## Testing expectations

At minimum: weighted exam generation against a config, scoring including
multi-answer questions, the persistence layer's per-certification
namespacing, and the schema refinements that types cannot express — the
QuestionSchema and CertConfigSchema rules `npm run validate` relies on.

CI runs `validate`, `typecheck` and `test`. `typecheck` is not optional
there: `vite build` strips types with esbuild rather than checking them,
and the unit tests never see a type error, so `tsc` is the only gate.

## Working style

- Propose structure and plan before large changes; wait for approval.
- Small, descriptive commits.
- Run the app and tests as you go.
- Update this file and the README when a decision or convention changes.
