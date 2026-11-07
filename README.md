# HagiCode CLI

[![npm version](https://img.shields.io/npm/v/%40hagicode%2Fcli?logo=npm&color=cb3837)](https://www.npmjs.com/package/@hagicode/cli)
[![npm downloads](https://img.shields.io/npm/dm/%40hagicode%2Fcli?logo=npm&color=2d8cf0)](https://www.npmjs.com/package/@hagicode/cli)
[![license](https://img.shields.io/npm/l/%40hagicode%2Fcli?color=ffd43b)](https://www.npmjs.com/package/@hagicode/cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

`@hagicode/cli` provides the published `hagi` command, which lets you drive a HagiCode backend from a terminal, scripts, or an AI agent without opening the app. Manage projects, proposals (generate, execute, archive, and send), vaults and their files, chat sessions, HagiTasks, scheduled plans, and skills (local list, enable, disable and uninstall, gallery search and install, and trusted providers). Every command supports a shared `--json` output for scripting, and an embedded Hagi skill under [`skills/`](skills/) guides agent workflows.

## Requirements

- Node.js 24+
- Access to a HagiCode backend API

## Installation

Use the published npm package for normal CLI usage. You do not need to clone this repository to run `hagi`.

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
hagi hagitask list
hagi hagitask create --title "Auto commit" --project-id <project-id> --prompt-id auto-compose-commit.en-US
```

## Embedded Skills

If you are integrating Hagi CLI into an agent workflow, start from the embedded skill package in this repository:

- [`skills/README.md`](skills/README.md) - repository-level discovery entrypoint
- [`skills/hagi/SKILL.md`](skills/hagi/SKILL.md) - canonical Hagi skill contract
- [`skills/hagi/references/`](skills/hagi/references/) - focused package usage, session data, proposal flow, maintainer, and validation guidance

The same folder is also shipped as the HagiCode server's built-in skill `hagi`, so an agent running inside a HagiCode session can answer questions about the user's own projects, proposals, sessions, vaults and plans without setup. Edit `skills/hagi/` here; the built-in copy is recopied from it.

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
  "baseUrl": "https://hagicode.example.com",
  "steer": false
}
```

If none of the three is set, the command exits with code `2` and sends no backend request. The `steer` key is the default for `hagi chat send`, `hagi proposal send`, and `hagi hagitask send` (see [Steer](#steer-send-option)); it must be `true` or `false`.

Operation commands send requests without a credential by default. Pass `--token` (or set `HAGI_API_TOKEN`) only when your backend requires one.

When the backend cannot be reached, the CLI names the base URL and exits with code `60`. A backend failure is reported differently: it prints the HTTP-equivalent status of the gRPC status and the backend error message, and exits with a status-mapped code.

```text
$ hagi --base-url http://127.0.0.1:1 project list
Cannot reach HagiCode backend at http://127.0.0.1:1. Check that the backend is running and the base URL is correct.

$ echo $?
60
```

## Command Overview

```text
hagi
|-- project   list | repositories | create | update | delete
|   `-- monospecs show | init | set | validate | reload | clone | remove-checkout
|-- proposal  list | create | optimize-description | generate | annotate | execute | archive | status | complete | send | get | messages
|-- vault     list | create | update | delete
|   `-- files list | preview
|-- chat      list | create | archive | delete | send
|-- hagitask  list | schema | create | send | get | messages
|-- plan      list | get | create | update | enable | disable | delete | run
`-- skills    local list | enable | disable | uninstall
              gallery search | detail | install
              trusted list | upsert | delete | reset
```

The `send` commands of `chat`, `proposal`, and `hagitask` also take `--steer` and `--no-steer`, and `HAGI_SEND_STEER` sets the default. See [Steer](#steer-send-option).

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

List the repositories of one project. The read-only command prints each repository's name, path relative to the project root, display name, type and branch. These paths are the values a proposal's repository scope names:

```bash
hagi project repositories --id "$PROJECT_ID"
hagi project repositories --id "$PROJECT_ID" --json
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

## MonoSpecs Commands

`project monospecs` manages a project's MonoSpecs configuration (`monospecs.yaml`) and the local checkouts of its repositories. The CLI only sends requests: the backend reads and writes the files and runs Git on its own host, so `--base-url` may point at a remote backend.

| Command | Purpose |
| --- | --- |
| `show --id <id>` | Print the version, repo directory, config path, commit-when-archive flag and one row per repository with its local Git state. `--yaml` adds the YAML preview. |
| `init --id <id>` | Initialize the configuration. An initialized project returns its existing document. |
| `set --id <id>` | Change metadata or repositories. Options: `--version`, `--repo-directory`, `--commit-when-archive <true\|false>`, repeatable `--add-repository <path>` and `--remove-repository <path>`, and `--clone`. `--url`, `--name`, `--display-name` and `--type` apply to a single `--add-repository`. |
| `validate --id <id>` | Validate the configuration. Exits `30` and still prints every error when it is invalid. |
| `reload --id <id>` | Reread `monospecs.yaml` on the backend host and refresh the Git state. |
| `clone --id <id>` | Clone configured repositories that are missing. Repeatable `--path <path>` selects repositories; `--include-optional` adds optional ones when no `--path` is given. |
| `remove-checkout --id <id> --path <path>` | Delete the local checkout of one configured repository. `--force` allows a checkout with uncommitted changes, unpushed commits or no upstream branch. |

```bash
hagi project monospecs show --id "$PROJECT_ID"
hagi project monospecs set --id "$PROJECT_ID" --commit-when-archive true
hagi project monospecs set --id "$PROJECT_ID" --add-repository repos/api --url https://github.com/example/api.git --clone
hagi project monospecs set --id "$PROJECT_ID" --remove-repository repos/api
hagi project monospecs validate --id "$PROJECT_ID" --json
hagi project monospecs clone --id "$PROJECT_ID" --path repos/web
hagi project monospecs remove-checkout --id "$PROJECT_ID" --path repos/web
```

Safety rules:

- `set` reads the current document, applies only the options given and saves the complete document. Local Git state (branch, sync state and similar) is never written back; `code` and `metadata` are kept.
- `set` rejects a duplicate `--add-repository`, a `--remove-repository` that is not configured, and companion options with more than one addition, before anything is saved. With `--clone`, the configuration is saved first; a failed clone leaves it saved and exits `30`.
- `clone` and `remove-checkout` act only on repositories listed in the configuration. The backend confines paths to the project root and clones only over `https`, `http`, `ssh` and `git`, so a `file://` URL or a plain path is reported as `failed`.
- `remove-checkout` refuses a checkout with uncommitted changes, unpushed commits or no upstream unless `--force` is given, and it never removes a path that is not a standalone repository root. It deletes a directory on the backend host and leaves `monospecs.yaml` unchanged.

Exit codes for these commands: `2` usage error (no request was sent), `20` backend validation error (every field error is listed), `24` project not found, `29` another clone or removal is running or a checkout is blocked, `30` invalid configuration or a failed clone.

## Proposal Commands

List proposal sessions for the example project:

```bash
hagi proposal list --project-id "$PROJECT_ID"
hagi proposal list --include-archived --json
```

Every proposal names its writable repositories and its read-only repositories. Take the paths from `hagi project repositories --id "$PROJECT_ID" --json`, and begin the chief complaint with a `Repository scope` section: a `Writable repositories:` list and a `Read-only repositories:` list, one `- <path>` entry per line, with `- none` for an empty list. The scope is a text convention in the chief complaint; `proposal create` has no scope flags. The format and a worked example are in [`skills/hagi/references/proposal-flow.md`](skills/hagi/references/proposal-flow.md#repository-scope).

Create a proposal session only. The new id is read from `session.sessionId`:

```bash
PROPOSAL_ID=$(hagi proposal create \
  --project-id "$PROJECT_ID" \
  --chief-complaint "Repository scope
Writable repositories:
- repos/cli
Read-only repositories:
- none

Add CLI completion for session workflows" \
  --default-title \
  --json | json_field '.session.sessionId')
```

Update status and send a follow-up message:

```bash
hagi proposal status --session-id "$PROPOSAL_ID" --status Reviewing
hagi proposal send --session-id "$PROPOSAL_ID" --content "Please continue"
```

Steer the message into the running turn, from the environment, or with a normal send that overrides the environment:

```bash
hagi proposal send --session-id "$PROPOSAL_ID" --content "Please continue" --steer
HAGI_SEND_STEER=1 hagi proposal send --session-id "$PROPOSAL_ID" --content "Please continue"
hagi proposal send --session-id "$PROPOSAL_ID" --content "Please continue" --no-steer
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

### Follow a Run

`proposal get` reads one session. With `--wait` it polls until the status settles, so the next lifecycle command runs at the right time. `proposal messages` reads the session's messages, newest first.

```bash
hagi proposal get --session-id "$PROPOSAL_ID" --wait --json
hagi proposal messages --session-id "$PROPOSAL_ID" --last 1 --json
```

The options are the same as `hagitask get`. WaitingForReply counts as settled, because a person must answer. Which stage each command starts is in [references/openspec-workflow.md](skills/hagi/references/openspec-workflow.md).

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
hagi chat send --session-id "$CHAT_ID" --content "Summarize the current diff" --steer
HAGI_SEND_STEER=1 hagi chat send --session-id "$CHAT_ID" --content "Summarize the current diff"
hagi chat send --session-id "$CHAT_ID" --content "Summarize the current diff" --no-steer
hagi chat archive --session-id "$CHAT_ID"
hagi chat delete --session-id "$CHAT_ID"
```

## HagiTask Commands

A HagiTask is a preset task with a structured input. Read its schema first, write the input from the schema, then create the session. `hagitask list` shows the active tasks:

```bash
hagi hagitask list
hagi hagitask list --json
```

`hagitask schema` shows one task's target scope, commands, parameters, requirements and scenes. Each required parameter is marked `yes`. The `--json` output adds the input JSON Schema and an example request body:

```bash
hagi hagitask schema --task-id <task-id>
hagi hagitask schema --task-id <task-id> --json
```

Write the input file. Its keys are the parameter keys the schema lists under `inputs`, plus the `targets` and `targetScopes` keys when the schema's scope lists targets. For example, `input.json` for a task with one required input:

```json
{
  "inputs": {
    "commitScope": "cli"
  }
}
```

Create the session from that task and input. The new id is read from `session.sessionId`:

```bash
HAGITASK_ID=$(hagi hagitask create \
  --title "Auto task" \
  --project-id "$PROJECT_ID" \
  --task-id <task-id> \
  --input input.json \
  --json | json_field '.session.sessionId')
```

Super Commit is a prompt, not a preset task. It has no schema and takes no `--input`. Start it with its prompt id, and pass the Git options it accepts:

```bash
SUPER_COMMIT_ID=$(hagi hagitask create \
  --title "Commit the CLI changes" \
  --project-id "$PROJECT_ID" \
  --prompt-id auto-compose-commit.en-US \
  --repository-path repos/cli \
  --target-branch-mode new-custom \
  --target-branch-name feature/cli-completion \
  --json | json_field '.session.sessionId')
```

Start a Super Commit only when the user asked for it. Add `--need-push` only when the user asked for a push. See [references/super-commit.md](skills/hagi/references/super-commit.md) for the options, the branch modes, the result and the explicit-request rule.

Use `--prompt-id` instead of `--task-id` for a prompt template with no structured input. `--input` needs `--task-id`. Input is read from a file, or from stdin with `--input -`. The CLI only checks that the input is a JSON object. The backend checks the keys and values. It rejects a key that the schema does not list, and a missing required value. Its error is printed unchanged, and no session is reported as created. `--hero-selection-mode` takes `first` (the default) or `random`.

The backend must have a hero available for the task's script. Without one, `hagitask create` fails with a 400 whose error is `no-executable-hero`.

Send a follow-up message to the HagiTask session:

```bash
hagi hagitask send --session-id "$HAGITASK_ID" --content "Retry with a smaller diff"
```

Steer the message into the running task, from the environment, or with a normal send that overrides the environment:

```bash
hagi hagitask send --session-id "$HAGITASK_ID" --content "Retry with a smaller diff" --steer
HAGI_SEND_STEER=1 hagi hagitask send --session-id "$HAGITASK_ID" --content "Retry with a smaller diff"
hagi hagitask send --session-id "$HAGITASK_ID" --content "Retry with a smaller diff" --no-steer
```

Read one HagiTask session, or wait until its status settles, and read its messages:

```bash
hagi hagitask get --session-id "$SUPER_COMMIT_ID" --wait --timeout 900 --json
hagi hagitask messages --session-id "$SUPER_COMMIT_ID" --last 1 --json
```

`hagitask get` reads one session. With `--wait` it polls every `--interval` seconds (default 5) until the status is no longer Optimizing, Openspecing, Executing or Archiving. `--timeout` (default 900) and `--grace` (default 10, `0` disables) are seconds, and `--timeout`, `--interval` and `--grace` need `--wait`. `--interval` must be less than `--timeout`. A timeout exits `31` and prints the last status. `hagitask messages --last <n>` reads the n newest messages; `--json` prints the list unchanged.

**Migration from AutoTask:** `hagi hagitask create` and `hagi hagitask send` replace `hagi autotask create` and `hagi autotask send`. There is no `autotask` alias, so an `autotask` command now fails as an unknown command. Read the task schema with `hagitask schema` to find the input keys that replace the old flags.

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

List installed local skills. The table shows each skill's origin (`user` or `built-in`), whether a built-in skill is enabled, its version, scope, agents and path. A user skill shows `-` in the Enabled column, because availability does not apply to it:

```bash
hagi skills local list
hagi skills local list --json
```

Turn a built-in skill on or off by name. The change applies to agent runs that start afterwards; a run already in progress keeps its skills. A name that is not a built-in skill exits with code `30`, and the output carries the backend message:

```bash
hagi skills local enable --skill-name hagi
hagi skills local disable --skill-name hagi --json
```

Built-in skills cannot be uninstalled. Use `skills local disable` to stop one from loading. Remove a user skill by name:

```bash
SKILL_NAME=demo-skill
hagi skills local uninstall --skill-name "$SKILL_NAME"
```

The uninstall result reports a status such as `Succeeded` or `PrerequisiteMissing`, with the backend message. Passing a built-in skill's name returns the backend's refusal unchanged.

Skill recommendation and install progress streaming are not part of the CLI. `skills gallery search`, `detail` and `install` are the discovery and install path.

Search the gallery and read one skill:

```bash
hagi skills gallery search --query react
hagi skills gallery search --query react --json
hagi skills gallery detail --id vercel-react-best-practices --source vercel-labs/agent-skills
```

`gallery detail` also shows third-party audit ratings for the skill, supplied by skills.sh (providers such as `ath`, `socket` and `snyk`). In `--json` output every detail field is unchanged and an `audit` object is added. It lists one entry per provider that supplied data; `risk`, `alerts`, `score` and `analyzedAt` appear only when the backend has them:

```json
{
  "id": "vercel-react-best-practices",
  "source": "vercel-labs/agent-skills",
  "...": "all other detail fields",
  "audit": {
    "providers": [
      { "provider": "ath", "risk": "low", "alerts": 0, "score": 92, "analyzedAt": "2026-10-30T08:00:00Z" },
      { "provider": "socket", "risk": "medium", "alerts": 2 }
    ]
  }
}
```

In human output the detail table is followed by one line per provider, for example `skills.sh audit (socket): risk=medium, alerts=2, score=--, analyzedAt=--`, where `--` marks a value the backend did not supply.

The audit is best-effort. If the audit call fails, times out or has no data, the detail still prints and the command exits `0`; in `--json` output `audit.providers` is then `[]`, never missing. The backend bounds the audit wait, and the CLI adds no timeout of its own. A failure of the detail call itself fails the command as before, and the audit never hides it. The audit does not change the install command preview or whether the skill is installable.

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

## Steer (send option)

`hagi chat send`, `hagi proposal send`, and `hagi hagitask send` deliver a message in one of two ways:

- **Normal send** (default): the message waits behind the running turn, as before.
- **Steer**: the message is inserted into the running turn through the backend's `SteerSession` RPC. The CLI makes one call.

Steer is off unless you ask for it. The first source that is set decides, in this order:

1. `--steer` (on) or `--no-steer` (off) on the command.
2. `HAGI_SEND_STEER`: `1`, `true`, `yes`, `on` turn Steer on; `0`, `false`, `no`, `off` turn it off. Case and surrounding spaces are ignored. Any other value exits with code `2` and sends no request.
3. `"steer": true` or `"steer": false` in the config file. Any other type exits with code `2` and names the file.
4. The default, `false`.

A lower source is not read once a higher one is set, so `--no-steer` works even when `HAGI_SEND_STEER` holds a value the CLI does not recognize.

### Outcomes

- `steered`: a running task took the message. It does not guarantee the text was used: the backend can return a steered message to the queue when the run ends.
- `queued`: no running task took the message, so it was sent as the next message. This is a success and exits with code `0`. The backend also answers `queued` for an idle session, where the message starts a run at once.

Human output adds `steer`, `effective`, `outcome`, and `messageId` rows, and a line saying no running task took the message for `queued`. `--json` keeps `sessionId`, `message`, and `requested`, and adds a `steer` object: `{ requested, source, effective, outcome?, messageId?, reason? }`. `source` is `flag`, `env`, `config`, or `default`. `reason` appears only when Steer was requested but not used. On the Steer path `message` is `Steered` or `Queued`.

### Conflicts and fallback

Steer carries text only, so it cannot be combined with `--mode` or `--executor-type`:

- `--steer` with either option exits with code `2` and sends nothing.
- When Steer comes only from `HAGI_SEND_STEER` or the config file, the command sends a normal message with the options and records the reason in `steer.reason`.
- When Steer comes only from `HAGI_SEND_STEER` or the config file and the backend does not implement `SteerSession`, the command sends a normal message and records the reason `the backend does not support Steer`. An explicit `--steer` reports the backend error instead.

A queued Steer is always sent in `Edit` mode. A session that must keep another mode should send with `--no-steer --mode <mode>`.

Steer works with the executors the backend supports. For any other executor, the backend answers `queued`.

### Unattended messaging

For session-to-session messages sent by an orchestrator without a person watching, set `HAGI_SEND_STEER=1` in its environment. Add `--no-steer` to a single call that must go through the normal queue.

## Environment Variables

The CLI resolves runtime settings centrally before every command. Explicit flags always override environment variables.

| Variable | Purpose |
| --- | --- |
| `HAGI_API_BASE_URL` | Backend base URL, used when `--base-url` is not given. Overrides the config file. Required when neither is set. |
| `HAGI_API_TOKEN` | Bearer token attached as `Authorization: Bearer <token>`. |
| `HAGI_API_LANG` | Shared `Accept-Language` header value. |
| `HAGI_SEND_STEER` | Turns Steer on (`1`, `true`, `yes`, `on`) or off (`0`, `false`, `no`, `off`) for the send commands, ignoring case and surrounding spaces. Any other value exits with code `2`. Overridden by `--steer` / `--no-steer`. Order: flag, then this variable, then the `steer` config key, then `false`. |

## Backend Transport

The CLI talks to the backend over gRPC-Web only. It appends `/grpc` to the base URL (for example `http://127.0.0.1:35167/grpc`) and calls the `hagicode.*.v1` services; no REST route is used. gRPC-Web runs over HTTP/1.1, so it works against the plain-HTTP local backend and through reverse proxies. The bearer token, `Accept-Language` and the `X-Hagi-Client` marker travel as request headers. The backend therefore has to expose its `/grpc` endpoints.

gRPC status codes keep the exit codes below: `InvalidArgument` is `20`, `Unauthenticated` `21`, `PermissionDenied` `23`, `NotFound` `24`, `FailedPrecondition`, `AlreadyExists` and `Aborted` `29`, other client-side statuses `40`, and `Internal`, `Unavailable`, `DeadlineExceeded` and the rest `50`. The status line in error output (`status=404`) shows the HTTP-equivalent number.

## Exit Codes

Stable non-zero exits used by the CLI. The HTTP numbers are the equivalents of the gRPC status the backend answered with:

| Exit code | Meaning |
| --- | --- |
| `2` | CLI usage or validation failure |
| `20` | HTTP 400 |
| `21` | HTTP 401 |
| `23` | HTTP 403 |
| `24` | HTTP 404 |
| `29` | HTTP 409 |
| `30` | Operation failed: the backend returned a refusal, for example `skills local enable` or `disable` on a name that is not a built-in skill, an invalid MonoSpecs configuration from `project monospecs validate`, or a failed clone from `project monospecs clone` or `set --clone` |
| `31` | Wait timed out: `--wait` on `proposal get` or `hagitask get` reached `--timeout` before the session settled. The last status is printed. Not a success, and not a backend error |
| `40` | Other HTTP 4xx |
| `50` | HTTP 5xx |
| `60` | Transport or connection failure |
| `70` | Unknown error |
