---
public: true
multilingual: false
style: technical
---

# README requirements

## Audience and focus

- Address developers and AI agents who use the published `hagi` command from `@hagicode/cli` to manage projects, proposals, vaults, chat, AutoTasks and scheduled plans against a HagiCode backend.

## Required content

- Keep requirements, installation, quick start, embedded skills, shared runtime flags, connection setup, the per-area command sections, maintainer workflow, release automation, environment variables, API client generation and exit codes.
- Command names and flags must match `src/`; the `skills/` directory stays the single source for the embedded skill.
- The license statement must match `package.json` (`AGPL-3.0-or-later`).

## Exclusions

- Exclude API keys, tokens, secret values, internal hosts, machine-specific paths and private links.
