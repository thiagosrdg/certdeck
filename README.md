# Projects

Umbrella repository: each project lives in its own folder at the root, with
its own npm workspace, tests, and build.

| Project | What it is |
|---------|------------|
| [certdeck](certdeck/) | Offline-first exam simulators for IT certifications (CompTIA and similar) |

GitHub Pages deployment is handled by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which runs
from `certdeck/`. The workflow lives at the repository root because Actions
only runs workflows from there.

## Working on a project

```bash
cd certdeck
npm install
npm run dev
```
