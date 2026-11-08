# acceptance.md

## Instruction
Give every plan item one acceptance command. A separate verification worker runs it, so it must decide pass or fail by itself.

- One heading per item: `## <ID> <name>`, followed by one line `cmd: <command>`.
- The command runs from the project root (the folder that holds `.hagicode`), not from the saga root. Write `cd <dir> && ...` when it needs a subfolder. Exit code 0 means the item is done.
- The command must be able to fail. A command that always passes proves nothing.
- Every plan item has exactly one heading here, and every heading here is a plan item. If you change the command of an item that is already ticked, the next freeze reopens that item.

## Template
```
## <ID> <name>
cmd: <command to run from the project root>
```
