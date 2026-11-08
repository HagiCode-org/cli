# goal.md

## Instruction
Write the goal contract of the saga: what it must achieve, in what scope, with which safety rules.

- Every work item the saga will have must be checkable by a machine (a command that exits 0 when the item is done). Say so in the goal.
- Write the non-goals and the block conditions (when an item is blocked instead of forced).
- Do not write implementation details.
- Write in the language the user used for the objective.
- If `amendments/` holds files whose `merged-in:` line is empty, fold them in and set `merged-in: r<next revision>` in each file (see `prompts/amend.md`).

## Template
```
## Goal

## Scope

## Non-goals

## Safety rules

## Block conditions
```
