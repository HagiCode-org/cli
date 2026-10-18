# HagiCode CLI

[![npm version](https://img.shields.io/npm/v/%40hagicode%2Fcli?logo=npm&color=cb3837)](https://www.npmjs.com/package/@hagicode/cli)
[![npm downloads](https://img.shields.io/npm/dm/%40hagicode%2Fcli?logo=npm&color=2d8cf0)](https://www.npmjs.com/package/@hagicode/cli)
[![license](https://img.shields.io/npm/l/%40hagicode%2Fcli?color=ffd43b)](https://www.npmjs.com/package/@hagicode/cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

`@hagicode/cli` provides the published `hagi` command for project, proposal, vault, chat, AutoTask, and scheduled plan management against a HagiCode backend API.
The same repository also carries the canonical embedded Hagi skill under [`skills/`](skills/), so package usage and AI-oriented guidance live in one writable source.

## Requirements

- Node.js 24+
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
hagi vault list --json
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

## Connection Setup

Every operation command resolves the backend base URL on each invocation, in this order:

1. `--base-url <url>` flag
2. `HAGI_API_BASE_URL` environment variable
3. `baseUrl` in the local config file: `$XDG_CONFIG_HOME/hagi/config.json`, or `~/.config/hagi/config.json` when `XDG_CONFIG_HOME` is unset

```json
{
  "baseUrl": "https://hagicode.example.com"
}
```

If none of the three is set, the command exits with code `2` and sends no backend request.

Operation commands send requests without a credential by default. Pass `--token` (or set `HAGI_API_TOKEN`) only when your backend requires one.

When the backend cannot be reached, the CLI names the base URL and exits with code `60`. A backend HTTP error is reported differently: it prints the HTTP status and the backend error message, and exits with a status-mapped code.

```text
$ hagi --base-url http://127.0.0.1:1 project list
Cannot reach HagiCode backend at http://127.0.0.1:1. Check that the backend is running and the base URL is correct.

$ echo $?
60
```

## Command Overview

```text
hagi
|-- project   list | create | update | delete
|-- proposal  list | create | optimize-description | generate | annotate | execute | archive | status | complete | send
|-- vault     list | create | update | delete
|   `-- files list | preview
|-- chat      list | create | archive | delete | send
|-- autotask  create | send
|-- plan      list | get | create | update | enable | disable | delete | run
`-- skills    local list | uninstall
              gallery search | detail | install
              trusted list | upsert | delete | reset
```

## Example Setup

The examples in the family sections run in order against a local backend. They assume:

- the backend listens on `http://127.0.0.1:35167`
- `hagi` is on `PATH`
- `json_field` reads one field from `--json` output

```bash
export HAGI_API_BASE_URL=http://127.0.0.1:35167
json_field() { node -pe "JSON.parse(require('node:fs').readFileSync(0, 'utf8'))$1"; }

mkdir -p /tmp/cli-examples/repos/cli
PROJECT_ID=$(hagi project create --name "CLI Examples" --path /tmp/cli-examples --json | json_field '.project.id')
```

## Project Commands

List projects through the aggregation endpoint:

```bash
hagi project list
hagi project list --json
```

Create a project. The backend creates the directory if it does not exist. The new id is read from `project.id`:

```bash
DEMO_PROJECT_ID=$(hagi project create \
  --name "CLI Demo" \
  --path /tmp/cli-demo \
  --description "Automation sandbox" \
  --json | json_field '.project.id')
```

Update only part of a project record. The CLI resolves current project data first so omitted fields are preserved:

```bash
hagi project update --id "$DEMO_PROJECT_ID" --description "Updated description"
hagi project update --id "$DEMO_PROJECT_ID" --name "CLI Demo renamed"
```

Delete the demo project:

```bash
hagi project delete --id "$DEMO_PROJECT_ID"
```

## Proposal Commands

List proposal sessions for the example project:

```bash
hagi proposal list --project-id "$PROJECT_ID"
hagi proposal list --include-archived --json
```

Create a proposal session only. The new id is read from `session.sessionId`:

```bash
PROPOSAL_ID=$(hagi proposal create \
  --project-id "$PROJECT_ID" \
  --chief-complaint "Add CLI completion for session workflows" \
  --default-title \
  --json | json_field '.session.sessionId')
```

Update status and send a follow-up message:

```bash
hagi proposal status --session-id "$PROPOSAL_ID" --status Reviewing
hagi proposal send --session-id "$PROPOSAL_ID" --content "Please continue"
```

The next steps are AI lifecycle actions and need a backend with an AI executor. `optimize-description` writes the optimized title, description, and proposal name to the session in one backend step, and `generate` needs that name. Without the AI executor, or before the name exists, the backend answers with a 400 that names the missing state:

```bash
hagi proposal optimize-description --session-id "$PROPOSAL_ID" --description "Add CLI completion for session workflows" --default-title
hagi proposal generate --session-id "$PROPOSAL_ID" --proposal-content-language en-US --enable-explore-mode

cat > annotations.json <<'EOF'
{"files":[{"fileName":"proposal.md","filePath":"proposal.md"}]}
EOF
hagi proposal annotate --session-id "$PROPOSAL_ID" --input annotations.json
cat annotations.json | hagi proposal annotate --session-id "$PROPOSAL_ID" --input - --json

hagi proposal execute --session-id "$PROPOSAL_ID"
hagi proposal complete --session-id "$PROPOSAL_ID"
hagi proposal archive --session-id "$PROPOSAL_ID"
```

### Explicit Lifecycle Sequence

The CLI keeps proposal lifecycle actions explicit and non-interactive. Each command maps to one backend action:

1. `hagi proposal list`
2. `hagi proposal create`
3. `hagi proposal optimize-description --session-id <session-id> --description <text>` (sets the title, description, and proposal name)
4. `hagi proposal generate --session-id <session-id> --proposal-content-language <language>` (optionally `--enable-explore-mode`)
5. `hagi proposal annotate --session-id <session-id> --input <file>` (optional review loop)
6. `hagi proposal execute --session-id <session-id>`
7. `hagi proposal complete --session-id <session-id>`
8. `hagi proposal archive --session-id <session-id>`

The CLI may suggest a next command, but it never chains later lifecycle APIs automatically.

Each command maps to one backend action. The CLI may suggest a next command, but it never chains later lifecycle APIs automatically.

## Vault Commands

Create a vault with a local folder to browse. The new id is read from `vault.id`:

```bash
mkdir -p /tmp/cli-vault-notes/docs
printf '# Notes\n' > /tmp/cli-vault-notes/docs/readme.md

VAULT_ID=$(hagi vault create \
  --name "Main Notes" \
  --type folder \
  --physical-path /tmp/cli-vault-notes \
  --json | json_field '.vault.id')
```

List registered vaults:

```bash
hagi vault list
hagi vault list --json
```

Update only part of a vault record. The CLI resolves the current vault snapshot first so omitted fields are preserved:

```bash
hagi vault update --id "$VAULT_ID" --name "Renamed Vault"
```

Browse vault files and preview supported content:

```bash
hagi vault files list --id "$VAULT_ID"
hagi vault files list --id "$VAULT_ID" --path docs --json
hagi vault files preview --id "$VAULT_ID" --path docs/readme.md
```

Delete a vault and request backend cleanup of its local files:

```bash
hagi vault delete --id "$VAULT_ID" --delete-local-files --json
```

## Chat Commands

Create a chat session. The new id is read from `session.sessionId`:

```bash
CHAT_ID=$(hagi chat create \
  --title "Repository Q&A" \
  --project-id "$PROJECT_ID" \
  --json | json_field '.session.sessionId')
```

List chat sessions:

```bash
hagi chat list --active-only
hagi chat list --include-archived --json
```

Send a message, archive, and delete:

```bash
hagi chat send --session-id "$CHAT_ID" --content "Summarize the current diff"
hagi chat archive --session-id "$CHAT_ID"
hagi chat delete --session-id "$CHAT_ID"
```

## AutoTask Commands

Create an AutoTask session with package-first automation flags. The new id is read from `session.sessionId`:

```bash
AUTOTASK_ID=$(hagi autotask create \
  --title "Auto compose commit" \
  --project-id "$PROJECT_ID" \
  --prompt-id auto-compose-commit.en-US \
  --repository-path repos/cli \
  --need-push \
  --target-branch-mode new-custom \
  --target-branch-name feature/cli-completion \
  --script-key autotask.auto-compose-commit \
  --json | json_field '.session.sessionId')
```

The backend must have a hero available for the prompt's script. Without one, `autotask create` fails with a 400 whose error is `no-executable-hero`.

Send a follow-up message to the AutoTask session:

```bash
hagi autotask send --session-id "$AUTOTASK_ID" --content "Retry with a smaller diff"
```

## Plan Commands

A scheduled plan saves a proposal or HagiTask input with a schedule and an agent pool. The backend runs it on that schedule. `plan list` and `plan get` show the plans that exist:

```bash
hagi plan list
hagi plan list --json
hagi plan get --id "$PLAN_ID"
hagi plan get --id "$PLAN_ID" --json | jq .plan
```

`plan list` prints one row per plan with its schedule summary, and an explicit message when there are none. `--json` prints `{ "plans": [...] }`, where each entry carries `id`, `type`, `name`, `enabled`, `state`, `nextRunAt`, `schedule`, `agentPool` and `payload` exactly as the backend returns them. `plan get --json` prints `{ "plan": {...} }` with the same fields.

### Create a plan

`plan create` reads a plan document with `--input <file>` or `--input -` for stdin. A recurring HagiTask plan:

```json
{
  "type": "hagitask",
  "name": "Nightly review",
  "enabled": true,
  "schedule": {
    "mode": "recurring",
    "timeZone": "Asia/Shanghai",
    "startDate": "2026-05-01",
    "endDate": "2026-05-31",
    "timeOfDay": "02:00",
    "repeat": { "rule": "daily", "weekdays": [] }
  },
  "agentPool": { "strategy": "random", "agents": [ { "heroId": "5de02573-0000-4000-8000-000000000001" } ] },
  "payload": {
    "projectId": "11111111-2222-3333-4444-555555555555",
    "presetTaskId": "nightly-review"
  }
}
```

A one-time proposal plan runs once at `runAt` and has no time zone or repeat fields:

```json
{
  "type": "proposal",
  "name": "Weekly triage",
  "schedule": { "mode": "once", "runAt": "2026-06-12T10:30:00Z" },
  "payload": {
    "title": "Weekly triage",
    "chiefComplaint": "Triage the open issues and propose the next sprint",
    "projectId": "11111111-2222-3333-4444-555555555555"
  }
}
```

```bash
hagi plan create --input nightly-review.json
hagi plan create --input weekly-triage.json --disabled
PLAN_ID=$(hagi plan create --input nightly-review.json --json | json_field '.plan.id')
```

A plan is **enabled by default**. `create` sends `enabled: true` unless the document sets `enabled` or you pass `--disabled`. `--name` and `--hero-id` replace the document's `name` and agent pool, and `--hero-id` builds the single-agent `random` pool. Server-owned fields (`id`, `createdAt`, `updatedAt`, `state`, `nextRunAt`) in the document are ignored.

### Update, enable, disable and delete

`plan update` reads the current plan, applies your changes and sends the full plan back, so fields you do not mention keep their values:

```bash
hagi plan update --id "$PLAN_ID" --name "Nightly review (EU)"
hagi plan update --id "$PLAN_ID" --input changes.json
hagi plan update --id "$PLAN_ID" --hero-id 5de02573-0000-4000-8000-000000000002 --enabled
```

`--input` on update is a **shallow merge** over the top-level keys of the plan (`type`, `name`, `enabled`, `schedule`, `agentPool`, `payload`). Each key in the file replaces the current value as a whole, and keys missing from the file are kept. A `schedule` in the file replaces the whole current schedule, so write the complete object, without the fields you want removed (for example `endDate`). Passing `--enabled` and `--disabled` together is a usage error, and so is an update with no change.

`enable` and `disable` change only the enabled flag. When the plan already has that flag, nothing is sent and the output says so:

```bash
hagi plan disable --id "$PLAN_ID"
hagi plan enable --id "$PLAN_ID" --json
```

Delete a plan. It never runs again:

```bash
hagi plan delete --id "$PLAN_ID"
hagi plan delete --id "$PLAN_ID" --json
```

To change a plan with a text editor, take the current document, edit it and feed it back. Server-owned fields are dropped automatically:

```bash
hagi plan get --id "$PLAN_ID" --json | jq .plan > plan.json
# edit plan.json, then:
hagi plan update --id "$PLAN_ID" --input plan.json
```

When the backend rejects a plan with 400 (exit code `20`), the CLI prints the summary and then one line per problem, naming its field:

```text
Scheduled plan is invalid. (status=400)
  - agentPool: A HagiTask plan needs an agent pool with one agent.
```

Use `--json` to get the full backend body under `error.details`.

### Run a plan now

`plan run` creates a session from the plan's stored inputs immediately, without waiting for the schedule. It waits for the session and prints its summary, or `{ "session": {...} }` with `--json`:

```bash
hagi plan run --id "$PLAN_ID"
```

`plan run --background` starts the same run and returns as soon as the backend accepts it, before the session exists. It prints the plan id and `accepted: true`. The session shows up in the normal session list:

```bash
hagi plan run --id "$PLAN_ID" --background --json
```

A manual run does not change the plan's state or next run time. It works for disabled and completed plans, and the next automatic run still happens on the original schedule.

## Skills Commands

List installed local skills and remove one by name:

```bash
hagi skills local list
hagi skills local list --json
SKILL_NAME=demo-skill
hagi skills local uninstall --skill-name "$SKILL_NAME"
```

The uninstall result reports a status such as `Succeeded` or `PrerequisiteMissing`, with the backend message.

Search the gallery and read one skill:

```bash
hagi skills gallery search --query react
hagi skills gallery search --query react --json
hagi skills gallery detail --id vercel-react-best-practices --source vercel-labs/agent-skills
```

Start a managed install of a gallery skill. This writes the skill into your local skill directories, so run it only when you intend to install it:

```bash
hagi skills gallery install \
  --id vercel-react-best-practices \
  --source vercel-labs/agent-skills \
  --skill-slug vercel-react-best-practices
```

Manage the trusted provider directory. `upsert` reads a JSON document from `--input <file>` or `--input -`:

```bash
hagi skills trusted list
cat > provider.json <<'EOF'
{"providerId":"example-provider","displayName":"Example","isEnabled":true,"sortOrder":50,"matchRules":[{"matchType":"owner","value":"example"}]}
EOF
hagi skills trusted upsert --input provider.json
cat provider.json | hagi skills trusted upsert --input - --json
hagi skills trusted delete --provider-id example-provider
hagi skills trusted reset
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

`repos/cli/.github/workflows/release-draft-action.yml` maintains the next GitHub draft release for `@hagicode/cli` through `HagiCode-org/hagi-release-drafter@v0.1.2`, built from Conventional Commit messages since the latest `vX.Y.Z` tag. It runs on pushes to `main` and on manual dispatch. The optional `version` input overrides the derived version and accepts only a stable `X.Y.Z`. The draft title is `HagiCode CLI v{version}`. Only the draft job holds `contents: write`, and the workflow never publishes. Publishing the draft is a manual step in the GitHub UI, and that publish triggers `npm-publish.yml`.
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
| `HAGI_API_BASE_URL` | Backend base URL, used when `--base-url` is not given. Overrides the config file. Required when neither is set. |
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
