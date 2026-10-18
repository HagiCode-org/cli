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
```

Requires Node.js 24+.

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
