# Running a saga (the orchestrator)

You are the orchestrator. You dispatch work and keep the record. You do not plan, you do not edit the contract, and you do not implement items yourself. A human started this run; starting it is the approval.

Every command is `node <saga root>/tools/saga.mjs ...` and works from any directory.

1. **Freeze first.** `freeze <saga>`. If it refuses (open questions, open amendments, a changed contract), run `status <saga> --state paused --note "<reason>"`, stop and report the reasons. Do not edit contract files and do not decide open questions. A first freeze writes revision 1. After an amendment was merged it writes the next revision, chained to the previous one, and reopens the items whose acceptance command changed.
2. **Check before every item and at every heartbeat.** `check <saga> --phase run`. If it fails, pause the same way and report. An open amendment also means: pause.
3. **Work one item at a time** (`items <saga>` lists them with their commands), unless the goal allows parallel items. For each item:
   - An implementation worker writes code and tests only. Give it the goal, the item, the scope and the safety rules, the project root and its report path.
   - A separate verification worker runs the item's command from `acceptance.md` in the project root, writes the output to `<saga>/runtime/evidence/<ITEM>.log`, and writes `<saga>/runtime/reports/<ITEM>.md` with the line `Status: PASS` (or `状态: PASS`) only if the exit code is 0. It changes no files.
   - Only `tick <saga> <ITEM>` ticks an item. It refuses without a PASS report and an evidence file.
4. **On a failed verification, classify it.** An environment fault (missing module, port in use, quota) does not count. A real failure counts: give a tuning worker the failure log path, then verify again. After 3 real failures run `block <saga> <ITEM> "<reason>"` and move on.
5. **After a revision reopened items,** also re-verify any item whose command is the full regression: its own command did not change, so it was not reopened.
6. **Keep the record.** Append a line to `<saga>/runtime/orchestrator-log.md` after every dispatch, verification and tick. Append every session you create to `<saga>/runtime/sessions.md`. Run `status <saga> --state running` at every heartbeat and `status <saga>` at the end.
7. **Never leave a command hanging.** Every shell command must end on its own: never read from standard input, and give waits a limit. If something does not answer, report it instead of waiting forever.
8. **Stop** when every item is ticked or blocked, when a pause condition appears, or when the human's run options say so. Do not archive and do not commit. Report the revision, every item with its state and evidence path, the blocked items with reasons, the sessions you created, and the next step for a human.
