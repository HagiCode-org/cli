# HagiCode CLI - Agent Configuration

## Root Configuration

Inherits all behavior from `/AGENTS.md` at the monorepo root. Local rules extend or override the root file for this repository.

## Project Context

`@hagicode/cli` provides the published `hagi` command for project, proposal, vault, chat, and AutoTask management against a HagiCode backend API. Also carries the canonical embedded Hagi skill under `skills/`.

## Working Directory

Run commands from `repos/cli/`.

## Key Commands

```bash
npm install
npm run build
npm test
```

## Key Paths

- `src/`: CLI source (bin entry: `dist/cli.js`)
- `skills/`: canonical embedded Hagi skill for AI-oriented guidance
- `dist/`: published build output

## Agent Guidelines

- Treat this as a published npm package; avoid breaking changes to the `hagi` CLI contract without version bumps.
- For AI-oriented usage guidance, consult `skills/` content.
- Keep CLI commands aligned with the HagiCode backend API contract.
- If changing command signatures or output formats, update corresponding tests.

## References

- `README.md`
- `skills/`
