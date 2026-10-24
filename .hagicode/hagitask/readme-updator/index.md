---
public: true
multilingual: false
style: product
---

# README requirements

## Product focus

- Introduce `@hagicode/cli` as the published `hagi` command-line tool that lets people drive a HagiCode backend from a terminal, scripts or an AI agent, without opening the app.
- Describe the main features users get, grounded in the command tree: manage projects, proposals (including generate, execute, archive and send), vaults and their files, chat sessions, AutoTasks, scheduled plans, and skills (local list and uninstall, gallery search and install, trusted providers). Mention the shared `--json` output for scripting and the embedded Hagi skill for agent workflows.
- Address developers and AI agents who use the `hagi` command first. This repository is itself a developer-facing product, so command usage is part of the product description.
- Lead with what the command lets users do against their backend, then how to install and run it.

## Required content

- Open with a short product introduction and the package badges the current README carries.
- Keep requirements, installation (zero-install, project-local and optional global), quick start, connection setup, shared runtime flags, environment variables, and exit codes, as the current README does.
- Keep one usage section per command area (project, proposal, vault, chat, AutoTask, plan, skills) with runnable examples, plus a pointer to the embedded Hagi skill for agent integration.
- Command names, flags, environment variables and exit codes must match `src/`.
- The license statement must match `package.json` (`AGPL-3.0-or-later`).

## Exclusions

- Exclude API keys, tokens, secret values, internal hosts, machine-specific paths and private links.
- Do not list commands or features the CLI does not provide.
- Keep repository maintenance instructions out of the README: maintainer workflow, release automation, API client generation, repository layout, skill source-of-truth ownership, internal architecture, CI and build internals.
