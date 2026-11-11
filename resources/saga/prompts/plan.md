# progress.md (the plan)

## Instruction
List the work items, one line each: `- [ ] <ID> <name> | `. The evidence path is added when an item is ticked.

- Items are small enough to verify with one command, and ordered so that earlier items do not depend on later ones.
- Keep the list short enough to review (roughly 3 to 15 items). Use the user's work items as a start; add or split items only when needed.
- Do not add items for committing, pushing, opening a pull request, releasing or archiving: they are outside the contract.
- IDs match the headings of `acceptance.md`.
- In a revision an item may be added or superseded, never deleted. A superseded item is written without brackets: `- ~ <ID> <name> | superseded in r<N>: <reason>`. A superseded item is not active: it has no node in the graph and no edges.
- Planning ends here. Do not run `freeze`, do not start the run, do not edit project code.

## Dependency graph
`progress.md` holds exactly one Mermaid `flowchart` that describes every dependency between the active items. Write it in its own section, outside the item rows. It is the only place dependencies are declared.

- Each active item is one node. The node ID equals the item ID, and the node label holds the item's name in quotes.
- An edge `A --> B` means B cannot start until A is ticked. Write an edge only when that order is required.
- Two items with no path between them are independent and may run together. Independence is expressed only by the absence of a path.
- Group nodes with one `subgraph` per module, repository or area the item changes, titled in quotes (for example `subgraph CLI["repos/cli"]`). A subgraph states ownership only. Two items in one subgraph are not dependent because of it, and items in different subgraphs are not dependent because of it either.
- Item IDs must be valid Mermaid node IDs: start with a letter and use only letters, digits and underscores (`T1`, `CLI_2`; not `1.2`, not `T-1`). Never use the word `end`. Put the readable name in the node label, not in the ID.
- Keep every dependency in this one graph. Do not declare a dependency in prose, in the note column after `|` of an item row (that text is evidence only), in a separate list, or in a second diagram.
- Item rows keep their format `- [ ] <ID> <name> | <evidence>` unchanged, and the graph lines are never edited by ticking an item.

## Template
```
- [ ] <ID> <name> | 
```

```mermaid
flowchart TD
    subgraph <MODULE>["<module or repository>"]
        <ID>["<ID> <name>"]
    end
    <ID> --> <ID>
```
</content>
