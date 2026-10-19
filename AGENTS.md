# HagiCode CLI - Agent Configuration

## Root Configuration

Inherits all behavior from `/AGENTS.md` at the monorepo root. Local rules extend or override the root file for this repository.

## Project Context

`@hagicode/cli` provides the published `hagi` command for project, proposal, vault, chat, AutoTask, scheduled plan, and skills management against a HagiCode backend API. Also carries the canonical embedded Hagi skill under `skills/`.

## Working Directory

Run commands from `repos/cli/`.

## Key Commands

```bash
npm install
npm run build
npm test
npm run typecheck
npm run pack:check
npm run generate:api   # regenerate src/generated/api from the backend OpenAPI doc
npm run dev -- <args>  # run the CLI from source via tsx (src/cli.ts)
```

Requires Node.js 24+.

## Release & Publishing

- `.github/workflows/npm-publish.yml`: pushes to `main` publish a dev build to the `dev` dist-tag (version resolved by `scripts/resolve-dev-version.mjs`); published (non-draft, non-prerelease) GitHub releases publish to `latest`, with the version taken from the stable `vX.Y.Z` tag checked by `scripts/verify-release-version.mjs`. The package version is stamped in CI, not hand-bumped for releases.
- Both paths run build, typecheck, test and `pack:check` first; keep them green. Release scripts are covered by `tests/release/`.

## Key Paths

- `src/`: CLI source (bin entry: `dist/cli.js`)
- `src/commands/`: one command family per file/dir (project, proposal, vault, chat, autotask, plan, skills)
- `src/formatters/`: human table and deterministic `--json` output
- `src/runtime/`: API runtime, `HagiApi` facade, error mapping
- `src/generated/api/`: generated OpenAPI client (`buildTools/`); regenerate instead of hand-editing
- `tests/`: Vitest suites (commands, formatters, runtime, release)
- `skills/`: canonical embedded Hagi skill for AI-oriented guidance
- `dist/`: published build output

## Agent Guidelines

- Treat this as a published npm package; avoid breaking changes to the `hagi` CLI contract without version bumps.
- For AI-oriented usage guidance, consult `skills/` content.
- Keep CLI commands aligned with the HagiCode backend API contract.
- If changing command signatures or output formats, update corresponding tests.
- Operation commands need a backend base URL (`--base-url`, `HAGI_API_BASE_URL`, or the local config file); there is no default.
- When adding a command family, also update `README.md` and the embedded skill under `skills/hagi/`.

## References

- `README.md`
- `skills/`
