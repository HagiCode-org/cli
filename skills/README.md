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
- [`hagi/references/proposal-flow.md`](hagi/references/proposal-flow.md) - explicit proposal lifecycle guidance
- [`hagi/references/local-development.md`](hagi/references/local-development.md) - maintainer-only source-tree workflows
- [`hagi/references/validation.md`](hagi/references/validation.md) - post-change validation steps

## Canonical writable source

Update `repos/cli/skills/**` when the Hagi CLI skill contract changes.
`repos/skills/**` remains a read-only historical/reference source during this consolidation.

## Skill installation and discovery

If an agent runtime or skill loader needs the Hagi skill source, point it at `repos/cli/skills/hagi/`.
Start discovery from this README, then open `repos/cli/skills/hagi/SKILL.md`.
Do not treat `repos/skills/hagi/` as the writable source for future updates.

## Maintainer note

When you are editing the CLI itself, use the maintainer-only workflows in `hagi/references/local-development.md`.
For normal usage and automation, stay package-first.
