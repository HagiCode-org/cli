# Saga commands

Saga files are project-local. Select exactly one project with `--path <directory>` or `--project-id <id>` for every
Saga command. A local `--path` is resolved on the CLI host and does not read backend configuration or make API calls.

## Initialize managed resources

Run `init` before creating a Saga:

```bash
hagi saga init --path "./My Project"
hagi saga init --path "./My Project" --force --json
```

Initialization installs the six bundled method prompts and the ignore template under `.hagicode/sagas`. It does not repair
or overwrite existing Saga contracts, metadata, or runtime records.

By default, differing managed resources are preserved as conflicts while missing nonconflicting resources are still
installed. The command prints each file's `created`, `unchanged`, `merged`, `replaced`, or `conflict` outcome and exits
with code `4` if any conflicts remain. Use `--force` to replace differing managed resources with the bundled versions;
identical resources remain untouched. Forced initialization never discards custom `.gitignore` entries.

The `.gitignore` rule `**/runtime/` is merged as a separate exact line. Existing bytes, line endings, and entries are
preserved; LF and CRLF files are supported, and repeated initialization does not append duplicate rules.

Before writing, initialization checks that managed directories and files are not redirected, that resource targets are
regular files, and that writes will not replace unsafe hard-linked resources. Refused targets are reported as operation
failures rather than followed outside the selected project. Exact resources are not rewritten on repeat runs, preserving
their modes and modification times.

With `--json`, stdout contains the installation root, `force` setting, per-file `path`/`outcome` entries, and any
conflicts. A conflict report is still emitted before the command reports the code-4 error on stderr.

## Create and inspect Sagas

`new <saga-id>` creates the Saga natively: it reserves `<saga-id>/` with an exclusive directory creation and writes
`saga.json` with `id`, `createdAt`, and `method`. It writes no runtime file. IDs must
match `^[a-z0-9][a-z0-9-]{0,62}$`: one to 63 lowercase letters, digits, or hyphens, beginning with a letter or digit. The
reserved names are `prompts`, `tools`, `archive`, `runtime`, `amendments`, and `revisions`. Invalid IDs are usage errors
(code `2`). An existing active path or an archive entry whose name ends in `-<saga-id>` is a collision; creation is
refused with code `30` and neither Saga is changed. Concurrent creations of one ID leave exactly one Saga.

The `--json` result identifies the Saga directory and includes the metadata written to `saga.json`:

```json
{
  "id": "demo",
  "directory": "/path/to/My Project/.hagicode/sagas/demo",
  "metadata": {
    "id": "demo",
    "createdAt": "2026-01-01T00:00:00Z",
    "method": 1
  }
}
```

The human result names the installed goal prompt and the four planning files to write. From the project root, the prompt is
`.hagicode/sagas/prompts/goal.md`; the planning files are `goal.md`, `research.md`, `acceptance.md`, and `progress.md`.

Then inspect the Saga with the read-only commands:

```bash
hagi saga new demo --path "./My Project" --json
hagi saga status demo --path "./My Project" --json
hagi saga list --path "./My Project"
hagi saga items demo --path "./My Project" --json
```

### Query payloads and read-only behavior

`list --json` returns `{ "sagas": [...] }`; each row contains `sagaId`, `state`, `revision`, `counts`, `openAmendments`,
and `updatedAt`. `items <saga-id> --json` returns `{ "sagaId": "...", "items": [...] }`, with each item carrying its
canonical `id`, `title`, `state`, `cmd`, and `note`.

`status <saga-id> --json` returns the `saga-status/2` projection directly, with `schema`, `sagaId`, `revision`, `state`,
`updatedAt`, `note`, `artifacts`, `nextArtifact`, `counts`, `openAmendments`, and `items`. It derives this view from the
Saga files; `updatedAt` is the time of this observation, not the execution heartbeat in `runtime/status.json`. The query
does not refresh or rewrite that stored status, and its default `note` is empty rather than a cached execution note.

All three queries are strictly read-only: they do not initialize or repair resources, create runtime files, run the Saga
tool, or execute acceptance commands. Missing optional draft files use canonical empty-data behavior; malformed or
unreadable existing data is reported instead of being repaired. ## Execution ownership and the token

`claim`, `assert-owner`, and `release` manage `runtime/execute.lock`. Every mutating command (`freeze`, `tick`, `block`,
`set-status`, `amend`, `archive`, `release`, `assert-owner`) reads the execution token from `--token <token>` or, when
that flag is absent, from `SAGA_EXECUTION_TOKEN`.

```bash
hagi saga claim demo --path "./My Project" --session orchestrator-1
hagi saga assert-owner demo --path "./My Project" --token "$SAGA_EXECUTION_TOKEN"
hagi saga release demo --path "./My Project" --token "$SAGA_EXECUTION_TOKEN" --workers-settled --json
```

- `claim --session <id>` creates the lock exclusively and returns the token once, in the human output and as `token` in
  JSON. A second claim is refused with code `1` and names the owning session. A lock is never taken over because of its
  age, and a refused claim changes no file.
- While a lock exists, a mutating command needs the holder's token. A missing or different token is refused with exit
  code `1` and changes no file. Without a lock, mutating commands run under their own gates, so a Saga created before ownership stays runnable.
- `assert-owner` exits `0` when no lock exists or the token matches, and `1` otherwise.
- `release` removes the lock only for the holder, with `--workers-settled`, and only when `runtime/status.json` records
  `paused` or `done`. Any other case exits `1` and keeps the lock.
- `status`, `items`, `list`, and `check` need no token and never write.
- With `--project-id`, the root `--token` is the backend bearer token, so `--token` is rejected with `--project-id` as a
  usage error (code `2`) that explains the rule. Pass the execution token through `SAGA_EXECUTION_TOKEN` instead. An execution token is never sent to the backend.

## Plan check and freeze

```bash
hagi saga check demo --path "./My Project" --phase plan
hagi saga check demo --path "./My Project" --phase run --json
hagi saga freeze demo --path "./My Project" --token "$SAGA_EXECUTION_TOKEN" --json
```

`check --phase plan` passes when `goal.md`, `research.md`, `acceptance.md`, and `progress.md` exist, `progress.md` has at
least one active item, every active item has an acceptance `cmd:`, and every acceptance entry names an active item.
`check --phase run` is the default; it adds the frozen-contract hash comparison, the amendment and open-question gates,
and the proof of every ticked item (an evidence file and a `Status: PASS` or `状态: PASS` report). Any other `--phase`
value is a usage error (code `2`). Checks write nothing.

`freeze` writes `contract.lock` revision 1 for a valid first contract. A repeat on an unchanged contract exits `0`, reports
the existing revision, and leaves the lock bytes intact. After a contract change, freeze writes revision N+1 only when an
amendment is merged into `rN+1` and no frozen item disappeared without a superseded row. The previous lock moves to
`revisions/rN.lock`, each ticked item whose acceptance command changed is reopened, and its evidence and report move to
`runtime/history/rN/`. Every refusal (open question, unmerged amendment, plan mismatch, tampered contract, removed item)
lists each reason, exits `1`, and writes nothing.

## Items, amendments, and archive

```bash
hagi saga tick demo T1 --path "./My Project" --token "$SAGA_EXECUTION_TOKEN" --json
hagi saga block demo T2 "tests keep failing" --path "./My Project" --token "$SAGA_EXECUTION_TOKEN"
hagi saga amend demo "Add retry" "Retry twice on timeout" --path "./My Project" --token "$SAGA_EXECUTION_TOKEN"
hagi saga archive demo --path "./My Project" --token "$SAGA_EXECUTION_TOKEN" --json
```

- `tick` marks an active item done in `progress.md` as `- [x] <id> <title> | evidence/<id>.log`. It needs a PASS report at
  `runtime/reports/<id>.md`, the evidence file, and a passing run check; otherwise it exits `1` and keeps `progress.md`.
  A successful tick clears that item's blocker. Item IDs containing a path separator or `.`/`..` are refused before any
  file access.
- `block` records a reason for an active item in `runtime/blocked.json`. An unknown item is refused. An empty reason is a
  usage error (code `2`).
- `amend` appends the next numbered file, `amendments/<NNN>-<slug>.md`, with an empty `merged-in:` header; the new
  amendment is open until the contract merges it. An empty title is a usage error (code `2`).
- `archive` moves a finished Saga (every active item done, no open amendment) to `archive/<date>-<saga-id>`. Use
  `--force` to archive unfinished work. An existing destination is refused even with `--force`.

## Status snapshot

```bash
hagi saga set-status demo --state paused --note "freeze refused" --path "./My Project" --token "$SAGA_EXECUTION_TOKEN" --json
```

`set-status --state` accepts `draft`, `planned`, `running`, `paused`, or `done`; any other value (or a missing value) is a
usage error (code `2`) and writes no file. The snapshot is the same `saga-status/2` projection that `status` reports, with
only `state` and `note` replaced. `planned` and `running` require the plan check to pass. `done` requires every active
item to be done with its evidence and PASS report, a frozen and unchanged contract, no open amendment, and no undecided
research question. A refusal exits `1`, lists its reasons, and leaves the stored `runtime/status.json` unchanged. The file
is replaced atomically, so a concurrent reader always sees a complete document.

## Exit codes and JSON

| Code | Meaning |
|------|---------|
| `0` | Success. |
| `1` | Refusal or failed check. Every reason is printed; nothing was changed. |
| `2` | Usage error: bad selector, missing or invalid argument, or `--token` with `--project-id`. |
| `4` | Init resource conflict (see above). |
| `24` | Saga or project not found. |
| `30` | Operation failed, including a `new` collision. |

Write and check commands accept `--json`. Success and refusal write one object to stdout:

```json
{ "sagaId": "demo", "command": "tick", "ok": true, "itemId": "T1", "evidence": "evidence/T1.log" }
{ "sagaId": "demo", "command": "tick", "ok": false, "errors": ["no PASS report for T1: runtime/reports/T1.md must contain \"Status: PASS\""] }
```

Human output prints a one-line outcome and one line per refusal reason.

## Runtime ignore precondition

Before any command writes a file under a Saga's `runtime/` directory (`claim`, `set-status`, `tick`, `block`, and a
`freeze` that moves history), it makes sure `.hagicode/sagas/.gitignore` ignores runtime directories. An existing
`**/runtime/` line is kept byte for byte; otherwise `**/runtime/` is appended with the file's line endings.
If the ignore file cannot be written, the command stops before `runtime/` is created.

## Read-only projection and ownership

Every write and check command is implemented by the CLI and never executes a separate tool. The CLI installs only the method prompts and the ignore rule; there is no installed tool to run.
