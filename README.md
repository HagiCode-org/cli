# HagiCode CLI

[![npm version](https://img.shields.io/npm/v/%40hagicode%2Fcli?logo=npm)](https://www.npmjs.com/package/@hagicode/cli)

`repos/cli` contains the npm-based `hagi` command for proposal session management.

## Requirements

- Node.js 20+
- npm compatible with `10.9.2`
- Access to a HagiCode backend API

## Installation

```bash
cd repos/cli
npm install
npm run build
```

Run the built CLI with:

```bash
npx hagi --help
node ./dist/cli.js --help
```

For local development without building:

```bash
cd repos/cli
npm run dev -- proposal list --json
```

## Release automation

`repos/cli/.github/workflows/release-drafter.yml` maintains the next GitHub draft release for `@hagicode/cli`.
`repos/cli/.github/workflows/npm-publish.yml` remains the stable publish entrypoint, and only strict `vX.Y.Z` tags publish to npm with GitHub Actions OIDC plus provenance.

### Draft release flow

1. Label each PR with one semantic version label: `major`, `minor`, or `patch`.
2. Add at least one release note category label:
   - `breaking-change` for breaking release note callouts
   - `feature` or `enhancement` for the `Features` section
   - `bug` for the `Fixes` section
   - `docs` or `documentation` for the `Documentation` section
   - `chore` or `dependencies` for the `Maintenance` section
3. Add `skip-changelog` only when the PR should stay out of the draft notes entirely, such as pure CI noise or internal housekeeping.
4. Merge the labeled PR into `main`, or update the PR while it is open.
5. Let Release Drafter refresh the GitHub draft release name, tag, and categorized notes.
6. Review the draft release in GitHub before creating the next stable tag.

Release Drafter manages draft release metadata only. It does not publish the package, change the stable tag verification commands, or replace the existing npm publish path.

### Current label coverage

At implementation time, the public `HagiCode-org/cli` label set already included `bug`, `documentation`, and `enhancement`.
The following planned release labels were still missing and should be created before maintainers rely on the full contract:

- `major`
- `minor`
- `patch`
- `breaking-change`
- `feature`
- `docs`
- `chore`
- `dependencies`
- `skip-changelog`

### Trusted Publisher prerequisites

Before the first automated release, an npm package owner must bind the package to the repository workflow:

1. Open the npm package settings for `@hagicode/cli`.
2. Add a Trusted Publisher for the GitHub repository `HagiCode-org/cli`.
3. Set the workflow file to `.github/workflows/npm-publish.yml`.
4. Keep the package access level public so `npm publish --access public` can succeed.

The workflow requests `contents: read` and `id-token: write`. It does not use a long-lived `NPM_TOKEN`.

### Local release verification

Run the same stable release gates locally before pushing a stable tag:

```bash
cd repos/cli
npm run publish:verify-release -- v0.1.0
npm run build
npm run typecheck
npm test
npm run pack:check
```

`publish:verify-release` fails unless the supplied tag exactly matches `package.json#version`.
`pack:check` runs `npm pack --dry-run --json` and rejects missing entrypoints or unexpected published files.

### Stable tag flow

1. Update `package.json` to the intended stable version such as `0.1.0`.
2. Make sure the draft release maintained by Release Drafter already reflects the intended tag such as `v0.1.0`.
3. Run the local verification commands above.
4. Commit the release-ready source tree.
5. Push a strict stable tag such as `v0.1.0`.
6. Confirm the GitHub Actions summary shows build, typecheck, test, package inspection, and `npm publish --tag latest --provenance --access public`.

## Environment Variables

The CLI resolves runtime settings centrally before every command. Explicit flags always override environment variables.

| Variable | Purpose |
| --- | --- |
| `HAGI_API_BASE_URL` | Backend base URL. Defaults to `http://127.0.0.1:35168` when unset. |
| `HAGI_API_TOKEN` | Bearer token attached as `Authorization: Bearer <token>`. |
| `HAGI_API_LANG` | Shared `Accept-Language` header value. |

Global flags:

- `--base-url <url>`
- `--token <token>`
- `--lang <lang>`
- `--json`

## Generate the API Client

The CLI owns its own OpenAPI configuration in `openapi-ts.config.json`.

```bash
cd repos/cli
npm run generate:api
npm run generate:api:once
```

Default Swagger source:

- `http://127.0.0.1:35168/swagger/v1/swagger.json`

When the backend cannot export Swagger in the current environment, keep `src/generated/api/**` aligned with the same controller contract used by `repos/web`, then regenerate when Swagger becomes available again.

`generate:api:once` matches the frontend workflow: it reuses an existing Swagger host when one is already up, otherwise it starts `repos/hagicode-core/src/PCode.SwaggerHost/PCode.SwaggerHost.csproj`, waits for Swagger readiness, runs the normal generator once, then stops the temporary host.

## Proposal Commands

`proposal list` queries proposal sessions through `GET /api/Sessions` with `type=Proposal`.

```bash
hagi proposal list --project-id <project-id>
hagi proposal list --include-archived --json
```

`proposal create` only creates the proposal session. It does not trigger any later lifecycle API.

```bash
hagi proposal create \
  --project-id <project-id> \
  --chief-complaint "Add npm commands for proposal APIs" \
  --default-title
```

`proposal generate-name` only generates the proposal name for an existing session.

```bash
hagi proposal generate-name --session-id <session-id>
```

`proposal generate` only starts proposal generation.

```bash
hagi proposal generate --session-id <session-id> --enable-explore-mode
hagi proposal generate --session-id <session-id> --hero-id <hero-id>
```

`proposal execute` only starts proposal execution.

```bash
hagi proposal execute --session-id <session-id>
```

## Explicit Lifecycle Sequence

The CLI keeps proposal lifecycle actions explicit and non-interactive:

1. `hagi proposal list`
2. `hagi proposal create`
3. `hagi proposal generate-name`
4. `hagi proposal generate`
5. `hagi proposal execute`

Each command maps to one backend action. The CLI prints the suggested next command, but it never chains later lifecycle APIs automatically.

## Exit Codes

Stable non-zero exits used by the CLI:

| Exit code | Meaning |
| --- | --- |
| `2` | CLI usage or validation failure |
| `20` | HTTP 400 |
| `21` | HTTP 401 |
| `23` | HTTP 403 |
| `24` | HTTP 404 |
| `29` | HTTP 409 |
| `40` | Other HTTP 4xx |
| `50` | HTTP 5xx |
| `60` | Transport or connection failure |
| `70` | Unknown error |
