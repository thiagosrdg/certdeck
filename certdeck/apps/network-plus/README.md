# CertDeck — CompTIA Network+

An offline exam simulator for **CompTIA Network+ (N10-009)**, part of the
[CertDeck](../../README.md) monorepo. Built on `packages/engine`; see the
root README and `AGENTS.md` for the shared architecture, and
`docs/design.md` for the card-game design system.

> **Unofficial.** Not affiliated with, endorsed by, or sponsored by CompTIA.
> All questions are original study material.

## Domains (N10-009)

| Domain | Name | Weight | Questions per full exam |
|---|---|---|---|
| 1.0 | Networking Concepts | 23% | 21 |
| 2.0 | Network Implementation | 20% | 18 |
| 3.0 | Network Operations | 19% | 17 |
| 4.0 | Network Security | 14% | 13 |
| 5.0 | Network Troubleshooting | 24% | 21 |

## Running

From the repository root:

```bash
npm install
npm run dev -w apps/network-plus
```

Or via the root `npm run dev`, which runs every app together.

## Adding questions

Drop a JSON file into `src/data/questions/` following the schema in the root
README, then run `npm run validate` from the repository root. The loader
globs the directory automatically — no code changes needed.

## Installing

Build and deploy via the repository's GitHub Actions workflow, or run
`npm run build -w apps/network-plus` and serve `dist/` locally to test the
installable PWA.
