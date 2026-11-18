# Embedded Skills

`repos/cli/skills/` is the repository-level discovery entrypoint for Hagi CLI skills.
Use this directory when you need the canonical agent-facing contract for the published `@hagicode/cli` package and the installed `hagi` command.

## Package-first usage

Treat the published package as the default execution path:

```bash
npx @hagicode/cli --help
npx @hagicode/cli proposal list --json
```

If `@hagicode/cli` is already installed, the same contract is available through:

```bash
hagi --help
```

Repository-local commands under `repos/cli` are maintainer workflows only.

## Available skill packages

- [`hagi/SKILL.md`](hagi/SKILL.md) - canonical Hagi CLI skill entrypoint
- [`hagi/agents/openai.yaml`](hagi/agents/openai.yaml) - agent display and invocation metadata
- [`hagi/references/cli-usage.md`](hagi/references/cli-usage.md) - published package usage and runtime flags
- [`hagi/references/session-data.md`](hagi/references/session-data.md) - inside a HagiCode session: read-only data commands and the actions that need an explicit request
- [`hagi/references/proposal-flow.md`](hagi/references/proposal-flow.md) - explicit proposal lifecycle guidance
- [`hagi/references/openspec-workflow.md`](hagi/references/openspec-workflow.md) - the OpenSpec stage each proposal command starts and how to follow a run
- [`hagi/references/resource-lock.md`](hagi/references/resource-lock.md) - the shared resource lock: owner, exit codes, the watcher protocol and requisition rules
- [`hagi/references/super-commit.md`](hagi/references/super-commit.md) - Super Commit through the CLI: prompt-id start, options, result and explicit-request rule
- [`hagi/references/local-development.md`](hagi/references/local-development.md) - maintainer-only source-tree workflows
- [`hagi/references/validation.md`](hagi/references/validation.md) - post-change validation steps

## Canonical writable source

Update `repos/cli/skills/**` when the Hagi CLI skill contract changes.

## Built-in copy

The server also ships this folder as its built-in skill `hagi`. The copy lives in `repos/built-in-skills/content/hagi/` and is an exact byte copy of `repos/cli/skills/hagi/`. Edit this folder only; the built-in copy follows by itself.

Hooks in `.githooks/` run after a commit (`post-commit`, which also covers amend and cherry-pick), a merge or pull (`post-merge`) and a rebase (`post-rewrite`) that touches `skills/hagi/`. They call `python3 ../built-in-skills/scripts/built_in_skills.py sync-hagi`, which copies the committed `skills/hagi/` into `content/hagi/`, sets the `hagi` lock entry's `ref` to the new commit and its `contentHash`, and runs `verify`. It changes the working tree of `repos/built-in-skills` but does not commit there. Enable it once per clone with `pnpm run hooks:install` (sets `core.hooksPath` to `.githooks`). Skip it with `HAGI_SKIP_BUILT_IN_SYNC=1`; point it at another checkout with `HAGI_BUILT_IN_SKILLS_DIR`. A sync may run twice during one rebase; it is idempotent. The hooks do not run on a fresh clone until `pnpm run hooks:install`; run `sync-hagi` by hand until then. A pull that fast-forwards onto a skill change made by someone else syncs your local `repos/built-in-skills` copy, but only the changes you commit there are shared.

## Skill installation and discovery

If an agent runtime or skill loader needs the Hagi skill source, point it at `repos/cli/skills/hagi/`.
Start discovery from this README, then open `repos/cli/skills/hagi/SKILL.md`.

## Maintainer note

When you are editing the CLI itself, use the maintainer-only workflows in `hagi/references/local-development.md`.
For normal usage and automation, stay package-first.
