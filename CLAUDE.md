# CLAUDE.md

Umbrella repo. Today it holds one project, **CertDeck**, in `certdeck/`;
other, unrelated projects may become sibling folders later. Never assume the
repo root is a project root.

**Read `certdeck/AGENTS.md` before touching CertDeck code.** It is the
authoritative spec — architecture rule, question schema, CertConfig, design
direction, quality floor. This file only covers what lives above it.

## Where things run

```bash
cd certdeck            # every npm command runs from here, not the repo root
npm run dev            # dev servers (landing + network-plus)
npm run validate       # question data — also runs in the pre-commit hook
npm run typecheck      # tsc --noEmit; the builds do NOT typecheck
npm run test           # unit tests
npm run build          # engine + landing + apps
```

The nesting has two consequences that are easy to break:

- `.github/workflows/deploy.yml` stays at the repo root because Actions only
  runs workflows from there. Its build jobs use
  `defaults.run.working-directory: certdeck`, but `upload-artifact` paths
  resolve against the repo root, so they keep the `certdeck/` prefix.
- Git hooks always run from the repo root. `prepare` is
  `cd .. && husky certdeck/.husky`, and the pre-commit hook does
  `cd certdeck && npm run validate`.

## Git workflow

Work directly on `main` — no feature branches, no PRs unless asked. Commit
and push at the end of each completed task without waiting to be asked.

## Open items

- **GitHub Pages is deliberately not enabled yet.** Publishing happens once,
  at the end of development — not incrementally. The workflow's `deploy` job
  is gated on `workflow_dispatch` to match, so a push runs `check`,
  `build-apps` and `build-landing` and nothing else: CI on `main` should be
  green, and a red run means a real failure worth reading. Enabling Pages is
  Thiago's call and makes the site public (Settings → Pages → Source: GitHub
  Actions); the repo name, Vite `base` and PWA scope already agree on
  lowercase `certdeck`, so nothing blocks it technically.
