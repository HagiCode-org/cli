---
name: hagi
description: Use when the user wants to run, verify, or update the HagiCode CLI against the Hagi API, or asks about their own projects, proposals, chat sessions, vaults, scheduled plans, or installed skills, including user skills versus built-in skills, and enabling or disabling a built-in skill. Keep package-first command guidance primary, then follow the proposal flow, local development, and validation references as needed. Inside a HagiCode session, read the session-data reference first for questions about the user's own data.
---

# Hagi

Use this skill when the user asks to:

- answer questions about their own projects, proposals, chat sessions, vaults, scheduled plans, or installed skills
- list which installed skills are user skills and which are built-in skills, or which built-in skills are enabled
- enable or disable a built-in skill
- run or verify the `hagi` CLI
- explain or execute `project`, `proposal`, `chat`, `autotask`, `vault`, `plan`, or `skills` commands
- inspect CLI flags, environment variables, exit codes, or JSON automation behavior
- validate proposal-session flows against a backend API
- modify or debug the CLI implementation in `repos/cli`

## Core rules

- Prefer `npx @hagicode/cli ...` for normal usage and package-level verification.
- Use `hagi ...` only when `@hagicode/cli` is already installed and on `PATH`.
- Run repository-local install, build, and test commands with the working directory set to `repos/cli`.
- Never run `npm install`, `npm run`, or other build commands at the monorepo root.
- Prioritize API invocation guidance over codebase tours unless the user explicitly wants implementation work.
- Built-in skills can be enabled or disabled with `hagi skills local enable --skill-name <name>` and `hagi skills local disable --skill-name <name>`. They cannot be uninstalled or updated through the CLI. A change applies to agent runs that start afterwards; a run already in progress keeps the skills it started with.
- Every proposal names its writable repositories and its read-only repositories, in a `Repository scope` section at the start of `--chief-complaint`. Both lists are always present, and an empty list is written as `none`. Take the paths from `hagi project repositories --id <project-id> --json`. When neither the user's request nor the session gives the scope, ask the user and offer those repositories as the choices; never guess a scope or widen the writable list. Details: [`references/proposal-flow.md`](references/proposal-flow.md#repository-scope).

## Choose the workflow

1. Published package usage -> read [`references/cli-usage.md`](references/cli-usage.md)
2. Explicit proposal lifecycle work -> read [`references/proposal-flow.md`](references/proposal-flow.md)
3. Source-tree development in `repos/cli` -> read [`references/local-development.md`](references/local-development.md)
4. Post-change validation -> read [`references/validation.md`](references/validation.md)
5. The user's own data, inside a HagiCode session -> read [`references/session-data.md`](references/session-data.md)

When `hagi` is loaded as a built-in skill inside a HagiCode session, read item 5 first for any question about the user's own data or skills, before the other references.

## Runtime configuration

Shared runtime flags:

- `--base-url <url>`
- `--token <token>`
- `--lang <lang>`
- `--json`

Equivalent environment variables:

- `HAGI_API_BASE_URL`
- `HAGI_API_TOKEN`
- `HAGI_API_LANG`

A base URL can also come from `"baseUrl"` in `$XDG_CONFIG_HOME/hagi/config.json`, or `~/.config/hagi/config.json` when `XDG_CONFIG_HOME` is unset.

Precedence: flag, then `HAGI_API_BASE_URL`, then the config file. The base URL has no default. When none of the three is set, the CLI exits with code `2`.

Inside a HagiCode session, the server can add four runtime variables to an agent run. They are present only while the built-in `hagi` skill is installed and enabled, and only on Claude Code, Pi, OpenCode, GitHub Copilot and omp:

| Variable | Carries |
| --- | --- |
| `HAGI_API_BASE_URL` | Address of the backend that started the session |
| `HAGI_VERSION` | Version of the HagiCode server |
| `HAGI_DEPLOYMENT_TYPE` | Deployment type of the server |
| `HAGI_API_LANG` | Effective AI language: `zh-CN` or `en-US`, sent as `Accept-Language` |

A variable the server cannot determine is left out, and the run still starts. Report an absent variable as absent; do not guess a value. Conditions and the rest of the session rules are in [`references/session-data.md`](references/session-data.md).

## Command surface

The current top-level command families are:

- `project`
- `proposal`
- `vault`
- `chat`
- `autotask`
- `plan`
- `skills`

`project repositories --id <project-id>` is read-only. It lists one project's repositories with each path relative to the project root (for example `repos/cli`). Those paths are the values a proposal's `Repository scope` names; see [`references/proposal-flow.md`](references/proposal-flow.md#repository-scope).

Scheduled plans (`hagi plan`) save a proposal or HagiTask input with a schedule. `list`, `get`, `create`, `update`, `enable`, `disable`, `delete` and `run` manage them; `run --background` returns the accepted plan id before the session exists. A manual run never changes a plan's state or next run time. See [`references/cli-usage.md`](references/cli-usage.md#plan-commands) for the action list and a plan document example.

## Source of truth

- Canonical writable skill source: `repos/cli/skills/hagi/`
- The server ships a byte-for-byte copy of this folder as its built-in skill `hagi`; edit here, never in the copy

## References

- [`references/cli-usage.md`](references/cli-usage.md) - package-first installation, quick start, runtime flags, and exit codes
- [`references/session-data.md`](references/session-data.md) - inside a HagiCode session: read-only data commands, state-changing actions that need an explicit request, and failure handling
- [`references/proposal-flow.md`](references/proposal-flow.md) - explicit proposal lifecycle sequence and command examples
- [`references/local-development.md`](references/local-development.md) - maintainer-only development, build, and repository internals
- [`references/validation.md`](references/validation.md) - targeted verification after documentation or code changes
