# HagiCode CLI

[![npm version](https://img.shields.io/npm/v/%40hagicode%2Fcli?logo=npm)](https://www.npmjs.com/package/@hagicode/cli)

`@hagicode/cli` provides the published `hagi` command for project, proposal, chat, and AutoTask management against a HagiCode backend API.
The same repository also carries the canonical embedded Hagi skill under [`skills/`](skills/), so package usage and AI-oriented guidance live in one writable source.

## Requirements

- Node.js 20+
- npm compatible with `10.9.2`
- Access to a HagiCode backend API

## Installation

Use the published npm package for normal CLI usage. You do not need to clone `repos/cli` to run `hagi`.

### Zero-install usage

```bash
npx @hagicode/cli --help
npx @hagicode/cli project list --json
```

### Project-local install

```bash
npm install @hagicode/cli
npx @hagicode/cli proposal list --json
```

### Optional global install

```bash
npm install -g @hagicode/cli
hagi --help
```

## Quick Start

The examples below use `hagi ...` after the package is available on your `PATH`. For one-off execution, replace `hagi` with `npx @hagicode/cli`.

```bash
hagi --help
hagi project list --json
hagi proposal list --json
hagi chat list --json
hagi autotask create --title "Auto commit" --project-id <project-id> --prompt-id auto-compose-commit.en-US
```

## Embedded Skills

If you are integrating Hagi CLI into an agent workflow, start from the embedded skill package in this repository:

- [`skills/README.md`](skills/README.md) - repository-level discovery entrypoint
- [`skills/hagi/SKILL.md`](skills/hagi/SKILL.md) - canonical Hagi skill contract
- [`skills/hagi/references/`](skills/hagi/references/) - focused package usage, proposal flow, maintainer, and validation guidance

`repos/cli/skills/**` is the canonical writable source for future Hagi skill updates.
`repos/skills/**` remains a historical/reference-only mirror during this consolidation.

Repository-local `npm run dev -- ...` and `node ./dist/cli.js ...` commands stay in the maintainer section below.

## Shared Runtime Flags

Every command family supports the same global runtime flags:

- `--base-url <url>`
- `--token <token>`
- `--lang <lang>`
- `--json`

Example:

```bash
hagi --base-url https://api.example.com --token "$HAGI_TOKEN" project list --json
```

## Command Overview

```text
hagi
|-- project   list | create | update | delete
|-- proposal  list | create | generate-name | optimize-description | generate | annotate | execute | archive | status | complete | send
|-- chat      list | create | archive | delete | send
`-- autotask  create | send
```

## Project Commands

List projects through the aggregation endpoint:

```bash
hagi project list
hagi project list --json
```

Create a project:

```bash
hagi project create \
  --name "CLI Demo" \
  --path /workspace/cli-demo \
  --description "Automation sandbox"
```

Update only part of a project record. The CLI resolves current project data first so omitted fields are preserved:

```bash
hagi project update --id <project-id> --description "Updated description"
hagi project update --id <project-id> --name "Renamed project" --path /workspace/new-path
```

Delete a project:

```bash
hagi project delete --id <project-id>
```

## Proposal Commands

List proposal sessions:

```bash
hagi proposal list --project-id <project-id>
hagi proposal list --include-archived --json
```

Create a proposal session only:

```bash
hagi proposal create \
  --project-id <project-id> \
  --chief-complaint "Add CLI completion for session workflows" \
  --default-title
```

Generate a proposal name explicitly:

```bash
hagi proposal generate-name --session-id <session-id>
```

Optimize the description explicitly:

```bash
hagi proposal optimize-description \
  --session-id <session-id> \
  --description "Improve the proposal framing" \
  --optimization-direction "Focus on implementation risk"
```

Generate and execute the proposal as separate steps:

```bash
hagi proposal generate --session-id <session-id> --enable-explore-mode
hagi proposal execute --session-id <session-id>
```

Submit structured annotation payloads from a file or stdin:

```bash
hagi proposal annotate --session-id <session-id> --input annotations.json
cat annotations.json | hagi proposal annotate --session-id <session-id> --input - --json
```

Archive, update status, complete, or send a follow-up message:

```bash
hagi proposal archive --session-id <session-id> --hero-id <hero-id>
hagi proposal status --session-id <session-id> --status Reviewing
hagi proposal complete --session-id <session-id>
hagi proposal send --session-id <session-id> --content "Please continue"
```

### Explicit Lifecycle Sequence

The CLI keeps proposal lifecycle actions explicit and non-interactive:

1. `hagi proposal list`
2. `hagi proposal create`
3. `hagi proposal generate-name`
4. `hagi proposal optimize-description` (optional)
5. `hagi proposal generate`
6. `hagi proposal annotate` (optional review loop)
7. `hagi proposal execute`
8. `hagi proposal archive`
9. `hagi proposal complete`

Each command maps to one backend action. The CLI may suggest a next command, but it never chains later lifecycle APIs automatically.

## Chat Commands

List chat sessions:

```bash
hagi chat list --active-only
hagi chat list --include-archived --json
```

Create a chat session:

```bash
hagi chat create \
  --title "Repository Q&A" \
  --project-id <project-id> \
  --executor-type CodexCli
```

Archive, delete, or send a message:

```bash
hagi chat archive --session-id <session-id>
hagi chat delete --session-id <session-id>
hagi chat send --session-id <session-id> --content "Summarize the current diff"
```

## AutoTask Commands

Create an AutoTask session with package-first automation flags:

```bash
hagi autotask create \
  --title "Auto compose commit" \
  --project-id <project-id> \
  --prompt-id auto-compose-commit.en-US \
  --repository-path repos/cli \
  --need-push \
  --target-branch-mode new-custom \
  --target-branch-name feature/cli-completion \
  --script-key autotask.auto-compose-commit
```

Send a follow-up message to an AutoTask session:

```bash
hagi autotask send --session-id <session-id> --content "Retry with a smaller diff"
```

## Maintainer Workflow (`repos/cli` only)

Use the commands in this section only when you are editing or validating the CLI source tree inside this repository.
Package consumers and automation should stay on `npx @hagicode/cli ...` or an installed `hagi ...` unless they are working on `repos/cli` itself.

Build the local repository output:

```bash
cd repos/cli
npm install
npm run build
node ./dist/cli.js --help
```

For local development without building:

```bash
cd repos/cli
npm run dev -- proposal list --json
npm run dev -- chat list --json
```

## Release Automation

`repos/cli/.github/workflows/release-drafter.yml` maintains the next GitHub draft release for `@hagicode/cli`.
`repos/cli/.github/workflows/npm-publish.yml` publishes two channels with GitHub Actions OIDC plus provenance:

- pushes to `main` publish a unique development prerelease under the npm `dev` dist-tag
- published GitHub Releases for strict `vX.Y.Z` tags publish the stable package under the npm `latest` dist-tag

### Local Release Verification

Run the stable release gates locally before publishing a GitHub Release:

```bash
cd repos/cli
version="$(npm run --silent publish:verify-release -- v0.1.0)"
npm version --no-git-tag-version "$version"
npm run build
npm run typecheck
npm test
npm run pack:check
```

## Environment Variables

The CLI resolves runtime settings centrally before every command. Explicit flags always override environment variables.

| Variable | Purpose |
| --- | --- |
| `HAGI_API_BASE_URL` | Backend base URL. Defaults to `http://127.0.0.1:35168` when unset. |
| `HAGI_API_TOKEN` | Bearer token attached as `Authorization: Bearer <token>`. |
| `HAGI_API_LANG` | Shared `Accept-Language` header value. |

## Generate the API Client

The CLI owns its own OpenAPI configuration in `openapi-ts.config.json`.

```bash
cd repos/cli
npm run generate:api
npm run generate:api:once
```

Default Swagger source:

- `http://127.0.0.1:35168/swagger/v1/swagger.json`

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
