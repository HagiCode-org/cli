# Validation

Run the smallest relevant set after changes.
Documentation-only updates do not require the full code validation stack, but cross-links and package metadata assumptions still need confirmation.

## Documentation and skill checks

Confirm these paths resolve and link correctly:

- `repos/cli/README.md`
- `repos/cli/skills/README.md`
- `repos/cli/skills/hagi/SKILL.md`
- `repos/cli/skills/hagi/agents/openai.yaml`
- `repos/cli/skills/hagi/references/*.md`

Check that every command named in the references is registered: the `hagi` help output after a build lists the same families and subcommands.

## Repository scope rule check

The repository scope rule for `proposal create` must appear in three files. Each one is checked on its own, and one file that still has the rule does not stand in for another:

- `SKILL.md` carries the core rule: the writable and read-only lists, and the `project repositories` query.
- `references/proposal-flow.md` carries the `Repository scope` section: the query step, the `Writable repositories:` and `Read-only repositories:` lists, and the example that begins its chief complaint with that section.
- `references/session-data.md` carries the state-changing rule: the scope is taken from the user or the session, and the agent asks when neither gives it instead of guessing.

Run this from `repos/cli` after editing any of the three:

```bash
grep -n "Repository scope" skills/hagi/SKILL.md skills/hagi/references/proposal-flow.md
grep -n "Read-only repositories" skills/hagi/SKILL.md skills/hagi/references/proposal-flow.md
grep -n "project repositories" skills/hagi/SKILL.md skills/hagi/references/proposal-flow.md skills/hagi/references/session-data.md
grep -n "ask the user" skills/hagi/SKILL.md skills/hagi/references/proposal-flow.md skills/hagi/references/session-data.md
```

Each of the three files must match the lines listed for it above. A file that is missing a match fails the check, and it is fixed in the skill folder, not by copying the rule from another file.

Confirm also that no skill file names `--writable-repo` or `--readonly-repo`, and that every `proposal create` example passes a chief complaint that begins with the `Repository scope` section.

## HagiTask command check

The `hagitask` command group must appear in the README and in each skill file that lists command families, and no file may document the retired `autotask` command. Run this from `repos/cli`:

```bash
for f in README.md skills/hagi/SKILL.md skills/hagi/references/cli-usage.md skills/hagi/references/session-data.md; do
  grep -q "hagitask" "$f" && echo "ok   hagitask in $f" || echo "FAIL hagitask missing from $f"
done
grep -rniE "autotask|auto-task" README.md skills --exclude=validation.md | grep -vi "migrat" || echo "ok   no autotask command documented"
```

Each file must print `ok`. The last grep lists only the migration notes (lines that say "migrat"), so any other match is a stale `autotask` reference and fails the check. This file is excluded from that grep because it names the pattern itself.

## Built-in copy consistency check

The embedded skill exists twice: `repos/cli/skills/hagi` is the only place it is edited, and `repos/built-in-skills/content/hagi` is the copy the server ships as the built-in `hagi` skill. Run this from the monorepo root to confirm the two match:

```bash
diff -r repos/cli/skills/hagi repos/built-in-skills/content/hagi
```

The expected result is no output, which means the folders are identical. Any output names a file that differs, is missing from one side, or is extra on one side.

- If the check reports a difference, fix it by editing only `repos/cli/skills/hagi`. Never edit the bundle copy by hand.
- Refreshing the bundle copy and its content hash is a separate follow-up in the bundle repository. It is not part of a CLI change, and a skill change leaves the check reporting differences until that follow-up runs.
- After the repository scope edit, the bundle copy must be recopied from `repos/cli/skills/hagi` and its hash refreshed. Doing that needs write access to `repos/built-in-skills`. Until then, sessions that load the built-in `hagi` skill run the older text, with no `project repositories` guidance.
- In a standalone CLI checkout the bundle is not beside the CLI. Replace `repos/built-in-skills/content/hagi` with the path to the `content/hagi` folder of a checked-out built-in skills bundle, for example `<path-to-built-in-skills>/content/hagi`.

## Maintainer validation commands

When command behavior, metadata, or packaging changes are involved, run the smallest relevant subset:

```bash
cd repos/cli
npm run build
npm run typecheck
npm test
node ./dist/cli.js --help
node ./dist/cli.js proposal --help
```

If only a specific command changed, also verify that command's help directly.

## Package publish-surface check

Run this only when `package.json`, publish contents, or release metadata changed:

```bash
cd repos/cli
npm run pack:check
```

The npm tarball ships `dist` and `README.md` only (`package.json` `files`), so `skills/**` is not in the package. The skill reaches users through the repository and the server's built-in skill copy, not through npm. Change `files` only if that decision changes.
