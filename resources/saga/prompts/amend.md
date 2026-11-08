# Folding an amendment into a saga

An amendment is a file under `<saga>/amendments/`. It is open while its `merged-in:` line is empty. Folding it in changes the planning artifacts only.

1. `hagi saga status <saga> --path <root> --json` reports the current `revision` N (0 means the saga was never frozen). The merge target is `r<N+1>`.
2. Read the amendment. Update `goal.md`, `research.md`, `acceptance.md` and `progress.md` so they agree with each other and with the amendment.
3. Items may be added or superseded (`- ~ <ID> <name> | superseded in r<N+1>: <reason>`), never deleted. Do not touch the ticks: when an item's acceptance command changes, the next freeze reopens it.
4. Do not decide new open questions yourself. List them under `## Open questions`.
5. In the amendment file set `merged-in: r<N+1>`.
6. Run `hagi saga check <saga> --phase plan --path <root>` and fix what it reports. Do not run `freeze`.
