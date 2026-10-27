# HagiCode CLI - Agent Configuration

## Root Configuration

Inherits all behavior from `/AGENTS.md` at the monorepo root. Local rules extend or override the root file for this repository.

## Project Context

`@hagicode/cli` provides the published `hagi` command for project, proposal, vault, chat, AutoTask, scheduled plan, and skills management against a HagiCode backend over gRPC-Web (`<base-url>/grpc`). Also carries the canonical embedded Hagi skill under `skills/`.

## Working Directory

Run commands from `repos/cli/`.

## Key Commands

```bash
npm install
npm run build
npm test
npm run typecheck
npm run pack:check
npm run generate:grpc   # regenerate src/generated/grpc (Connect-ES stubs) from ../hagicode-core/protos (or HAGICODE_PROTO_DIR) with the local buf
npm run generate:grpc:check   # fail when src/generated/grpc differs from a fresh generation
npm run generate:api   # regenerate the DTO types in src/generated/api/models from the OpenAPI doc at swaggerUrl in openapi-ts.config.json (a Swagger host must already be running)
npm run generate:api:once   # same, but starts (or reuses) the sibling repos/hagicode-core PCode.SwaggerHost first via dotnet
npm run dev -- <args>  # run the CLI from source via tsx (src/cli.ts)
```

Requires Node.js 24+.

## Release & Publishing

- `.github/workflows/npm-publish.yml`: pushes to `main` publish a dev build to the `dev` dist-tag (version resolved by `scripts/resolve-dev-version.mjs`); published (non-draft, non-prerelease) GitHub releases publish to `latest`, with the version taken from the stable `vX.Y.Z` tag checked by `scripts/verify-release-version.mjs`. The package version is stamped in CI, not hand-bumped for releases.
- `.github/workflows/release-draft-action.yml`: on push to `main` (or manual dispatch with an optional stable `X.Y.Z`) drafts the next stable release; publishing the draft stays manual.
- Both paths run build, typecheck, test and `pack:check` first; keep them green. Release scripts are covered by `tests/release/`.

## Key Paths

- `src/`: CLI source (bin entry: `dist/cli.js`)
- `src/commands/`: one command family per file/dir (project, proposal, vault, chat, autotask, plan, skills)
- `src/formatters/`: human table and deterministic `--json` output
- `src/runtime/`: API runtime, `HagiApi` facade (`hagiApi.ts`, one gRPC call per method), `grpc/` transport and proto-to-DTO mapper, error mapping (`ConnectError` to exit codes)
- `src/generated/grpc/`: generated gRPC stubs (`buf generate`), committed; regenerate instead of hand-editing
- `src/generated/api/models/`: generated DTO types only (OpenAPI); there is no REST client or runtime any more
- `tests/`: Vitest suites (commands, formatters, runtime, release)
- `skills/`: canonical embedded Hagi skill for AI-oriented guidance
- `dist/`: published build output

## Agent Guidelines

- Treat this as a published npm package; avoid breaking changes to the `hagi` CLI contract without version bumps.
- For AI-oriented usage guidance, consult `skills/` content.
- Keep CLI commands aligned with the HagiCode backend API contract. All backend calls go through gRPC (`protos/` in `repos/hagicode-core`); a new operation needs its RPC in the facade, not a REST call.
- If changing command signatures or output formats, update corresponding tests.
- Operation commands need a backend base URL (`--base-url`, `HAGI_API_BASE_URL`, or the local config file); there is no default.
- When adding a command family, also update `README.md` and the embedded skill under `skills/hagi/`.

## References

- `README.md`
- `skills/`
