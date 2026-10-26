# CLI Usage

Use the published package contract first.
The repository exists to build and maintain `@hagicode/cli`, but normal command execution should start from the package surface rather than the source tree.

## Installation paths

### Zero-install

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

## Quick start

When `@hagicode/cli` is already available on `PATH`, these examples work as `hagi ...`.
For one-off execution, replace `hagi` with `npx @hagicode/cli`.

```bash
hagi --help
hagi project list --json
hagi proposal list --json
hagi chat list --json
hagi hagitask list --json
hagi hagitask create --title "Auto commit" --project-id <project-id> --prompt-id auto-compose-commit.en-US
```

## Shared runtime flags

Every command family supports the same runtime flags:

- `--base-url <url>`
- `--token <token>`
- `--lang <lang>`
- `--json`

Example:

```bash
hagi --base-url https://api.example.com --token "$HAGI_TOKEN" project list --json
```

## Environment variables

The CLI resolves runtime settings centrally before every command.
Explicit flags always override environment variables.

| Variable | Purpose |
| --- | --- |
| `HAGI_API_BASE_URL` | Backend base URL, used when `--base-url` is not given. Overrides the config file. |
| `HAGI_API_TOKEN` | Bearer token attached as `Authorization: Bearer <token>`. |
| `HAGI_API_LANG` | Shared `Accept-Language` header value. |

## Config file

The base URL can also be stored in a local config file:

```json
{ "baseUrl": "https://api.example.com" }
```

The file is `$XDG_CONFIG_HOME/hagi/config.json`, or `~/.config/hagi/config.json` when `XDG_CONFIG_HOME` is unset.

Base URL precedence, highest first: `--base-url`, then `HAGI_API_BASE_URL`, then `baseUrl` in the config file.
There is no default. When none of the three is set, the CLI exits with code `2` and names all three sources.

## Command overview

```text
hagi
|-- project   list | repositories | create | update | delete
|-- proposal  list | create | optimize-description | generate | annotate | execute | archive | status | complete | send
|-- vault     list | create | update | delete
|   `-- files list | preview
|-- chat      list | create | archive | delete | send
|-- hagitask  list | schema | create | send
|-- plan      list | get | create | update | enable | disable | delete | run
`-- skills    local list | enable | disable | uninstall
              gallery search | detail | install
              trusted list | upsert | delete | reset
```

## Project repositories

`project repositories --id <project-id>` is read-only. It reads the same aggregation snapshot as `project list` and prints one project's repositories: name, path relative to the project root (for example `repos/cli`), display name, type and branch, with the project's MonoSpecs flag. The `path` values are the ones a proposal's `Repository scope` names.

```bash
npx @hagicode/cli project repositories --id <project-id> --json
```

An unknown project id exits with code `24` and prints no list.

## HagiTask commands

A HagiTask is a preset task with a structured input. Use the schema-first flow: list the tasks, read one task's schema, write the input file from the schema, then create the session.

```bash
hagi hagitask list --json
hagi hagitask schema --task-id compose-commit
hagi hagitask schema --task-id compose-commit --json
hagi hagitask create --title "Auto compose commit" --project-id <project-id> --task-id compose-commit --input input.json --json
hagi hagitask send --session-id <session-id> --content "Retry with a smaller diff"
```

- `schema` (human view) lists the target scope, commands and parameters, with each required parameter marked `yes`, then the requirements, scenes, endpoint and an example command. `--json` adds the input JSON Schema and the example request body.
- `create` needs `--title`, `--project-id`, and either `--task-id` or `--prompt-id`. `--input <file|->` needs `--task-id`. The input must be a JSON object. The CLI does not check its keys; the backend does, and it rejects a key that the schema does not list and a missing required value. A rejection is printed unchanged and no session is reported.
- `create --json` prints `{ session, presetTaskId, promptId, requested }`. Read the session id from `session.sessionId`.

Example `input.json` for a task with one required input:

```json
{
  "inputs": {
    "commitScope": "cli"
  }
}
```

Migration: `hagi hagitask create` and `hagi hagitask send` replace the former `autotask` commands. There is no alias, so `hagi autotask` fails as an unknown command.

## Plan commands

Scheduled plans save a proposal or HagiTask input with a schedule and, for HagiTask plans, an agent pool.

```text
hagi plan
|-- list
|-- get      --id <id>
|-- create   --input <file|-> [--name <name>] [--hero-id <id>] [--disabled]
|-- update   --id <id> [--input <file|->] [--name <name>] [--hero-id <id>] [--enabled | --disabled]
|-- enable   --id <id>
|-- disable  --id <id>
|-- delete   --id <id>
`-- run      --id <id> [--background]
```

- `create` enables the plan unless the document sets `enabled` or `--disabled` is passed.
- `update`, `enable` and `disable` read the current plan and send it back whole, so unchanged fields are kept. `update --input` replaces each top-level key it contains as a whole value.
- `run` creates a session now and waits for it. `run --background` returns `{ planId, accepted: true }` once the backend accepts the run, before the session exists.
- A manual run does not change the plan's state or next run time, and works for disabled and completed plans.

A one-time proposal plan document for `plan create --input`:

```json
{
  "type": "proposal",
  "name": "Weekly triage",
  "enabled": true,
  "schedule": { "mode": "once", "runAt": "2026-06-12T10:30:00Z" },
  "payload": {
    "title": "Weekly triage",
    "chiefComplaint": "Triage the open issues and propose the next sprint",
    "projectId": "<project-id>"
  }
}
```

The README's `## Plan Commands` section has a recurring HagiTask example and the full `update`, `enable`, `disable` and `delete` workflow.

## Skills commands

`skills local list` shows each installed skill with its origin (`user` or `built-in`), its enabled state for built-in skills (`yes` or `no`, shown as `-` for user skills), its version, scope, agents and path. `--json` returns the same data with the `origin` and `builtIn` fields.

```bash
hagi skills local list
hagi skills local list --json
hagi skills local enable --skill-name hagi
hagi skills local disable --skill-name hagi --json
```

- `enable` and `disable` take `--skill-name` and change one built-in skill. They apply to agent runs that start afterwards.
- `uninstall` removes a user skill. Built-in skills cannot be uninstalled; use `disable` to stop one from loading.
- Skill recommendation and install progress streaming are not part of the CLI. `skills gallery search`, `detail` and `install` are the discovery and install path.

## Exit codes

Stable non-zero exits used by the CLI:

| Exit code | Meaning |
| --- | --- |
| `2` | CLI usage or validation failure |
| `20` | HTTP 400 |
| `21` | HTTP 401 |
| `23` | HTTP 403 |
| `24` | HTTP 404 |
| `29` | HTTP 409 |
| `30` | Operation failed: the backend returned a refusal, for example `skills local enable` or `disable` on a name that is not a built-in skill |
| `40` | Other HTTP 4xx |
| `50` | HTTP 5xx |
| `60` | Transport or connection failure |
| `70` | Unknown error |
