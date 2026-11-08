# progress.md (the plan)

## Instruction
List the work items, one line each: `- [ ] <ID> <name> | `. The evidence path is added when an item is ticked.

- Items are small enough to verify with one command, mostly independent, and ordered so that earlier items do not depend on later ones.
- Keep the list short enough to review (roughly 3 to 15 items). Use the user's work items as a start; add or split items only when needed.
- Do not add items for committing, pushing, opening a pull request, releasing or archiving: they are outside the contract.
- IDs match the headings of `acceptance.md`.
- In a revision an item may be added or superseded, never deleted. A superseded item is written without brackets: `- ~ <ID> <name> | superseded in r<N>: <reason>`.
- Planning ends here. Do not run `freeze`, do not start the run, do not edit project code.

## Template
```
- [ ] <ID> <name> | 
```
