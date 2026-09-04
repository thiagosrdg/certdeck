# CertDeck

A monorepo of offline-first exam simulators for IT certifications, built
around a card-game metaphor: each certification is a **deck**, each question
is a **card**, and each exam domain is a **suit**. Cards flip as you move
through a deck, and the explanation lives on the back of the card.

Each certification is its own installable app, built on a shared engine.

Install one from the browser and it runs from your home screen like a native
app — phone, tablet, or desktop — with no connection required.

> **Unofficial.** Not affiliated with, endorsed by, or sponsored by CompTIA or
> any certification body. All questions are original study material written
> for personal preparation.

## Simulators

| App | Certification | Exam code | Status |
|-----|---------------|-----------|--------|
| **CertDeck** | CompTIA Network+ | N10-009 | In development |
| _planned_ | CompTIA Security+ | SY0-701 | Not started |

## Why a monorepo

Every simulator needs the same machinery: weighted exam generation, a timer,
scoring, review mode, per-domain results, local history. Only the questions
and the domain weights differ. So the engine lives in `packages/engine` and
knows nothing about any specific certification — adding a new one means a
config file and a folder of questions, not a fork.

## Structure

```
certdeck/
├── landing/              # static index of available simulators
├── packages/
│   └── engine/           # certification-agnostic logic and UI
└── apps/
    └── network-plus/     # the Network+ deck (N10-009)
        ├── src/data/questions/   # question JSON files
        └── src/cert.config.ts    # domains, weights, timing, thresholds
```

## Features

- **Full exam mode** — questions weighted to the certification's official
  domain distribution, on a timer, with flagging and a question navigator.
  Choose how it is played before the first card is dealt: *exam conditions*,
  where nothing is revealed until you submit, or *card by card*, where each
  answer is checked as you play it. Still timed and still scored either way.
- **Pause and resume** — leave a 90-card exam and come back to the card you
  were on, with the clock where you left it. This is a study tool, not a
  proctored room.
- **Practice by domain** — target specific domains with immediate feedback.
- **Random question** — single-question quick drills.
- **Explanations that teach** — the card flips to its reverse face to show why
  the correct option is correct *and* why each distractor is wrong.
- **Suits for domains** — every card carries its domain's suit mark, so the
  shape of your weak areas is visible at a glance.
- **Results worth reading** — score, pass/fail, XP earned, time per card,
  blanks, a per-suit breakdown, accuracy by difficulty, and the change against
  your previous attempt.
- **Statistics** — everything in history aggregated: mastery tier per domain,
  accuracy by difficulty and by exam objective, deck coverage, exam scores
  over time, and the weakest objectives to read up on.
- **Progression** — XP weighted by difficulty, levels, and a study streak.
  A mastery tier needs volume as well as accuracy, so one lucky card is never
  mistaken for mastery.
- **History** — attempts stored locally, so progress is visible over time.
- **Themes and accents** — light, dark, or follow the system, and seven accent
  colours, each checked for contrast on both card faces and kept clear of the
  suit hues and the right/wrong colours.

## Running locally

Requires Node.js 24 (see `.nvmrc`).

```bash
npm install
npm run dev        # run the apps in development
npm run build      # build everything
npm run validate   # validate every question file in every app
npm run typecheck  # tsc --noEmit; note that the builds do NOT typecheck
npm run test       # unit tests
```

## Installing an app

Simulators are installed from the published site as progressive web apps.
Publishing has not happened yet — see **Deployment** below — so there is no
public URL to install from at the moment. Once there is, open the site, pick
a simulator, then install it:

- **Android / tablet (Chrome):** menu → *Install app*
- **Desktop (Chrome / Edge):** the install icon in the address bar

After the first load everything is cached, questions included, and the app
works offline. Each simulator installs independently. When a new version is
deployed, the app shows an update prompt rather than silently serving a stale
build.

## Adding questions

Questions are plain JSON, separate from application code. Every file in an
app's `src/data/questions/` directory is loaded automatically, so adding a
batch means adding a file.

```jsonc
{
  "id": "n10-009-001",              // unique within the certification
  "domain": "1.0",                  // must exist in that app's cert.config.ts
  "domainName": "Networking Concepts",
  "objective": "1.1",               // official objective number
  "type": "single",                 // "single" | "multiple"
  "difficulty": "medium",           // "easy" | "medium" | "hard"
  "stem": "A technician needs to ...",
  "options": [
    { "id": "a", "text": "..." },
    { "id": "b", "text": "..." },
    { "id": "c", "text": "..." },
    { "id": "d", "text": "..." }
  ],
  "correct": ["b"],                 // more than one id when type is "multiple"
  "explanation": "Why the correct answer is correct.",
  "distractorExplanations": {       // one entry per incorrect option
    "a": "Why this is wrong.",
    "c": "Why this is wrong.",
    "d": "Why this is wrong."
  },
  "tags": ["osi-model", "encapsulation"]
}
```

Run `npm run validate` before committing.

## Adding a certification

1. Create `apps/<name>/` with a `cert.config.ts` describing the exam:
   domains, weights, question count, time limit, pass threshold.
2. Add question JSON files under `src/data/questions/`.
3. Add the app to the build matrix in the deploy workflow and to the landing
   page.

No engine changes should be required. If they are, the engine has leaked
certification-specific logic and needs fixing.

## Deployment

Pushing to `main` runs the checks and builds every app, but does **not**
publish: the deploy job is gated on `workflow_dispatch`, because publishing
is a deliberate act rather than something every commit does. To publish, run
the workflow manually from the Actions tab.

Each app is served from its own subpath, e.g. `/certdeck/network-plus/`.

One-time repository setup, required before the first publish:
**Settings → Pages → Source → GitHub Actions**.

## Tech stack

Vite · React · TypeScript · Tailwind CSS · Zustand · Zod · Vitest ·
vite-plugin-pwa · npm workspaces

## Roadmap

- [ ] Keep growing the Network+ question pool (468 so far)
- [ ] More multiple-response questions (18 so far)
- [ ] Subnetting drill mode with generated IPv4/IPv6 problems
- [ ] Data import/export for backing up attempt history
- [ ] Security+ (SY0-701) simulator

## License

MIT
