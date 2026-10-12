This diagnostic is issued when a public LRO status monitor has an active decorated polling
metadata property whose property or referenced type graph has explicit, active
`@access(Access.internal)`.

## How to fix

Make the operation internal, expose a public metadata type, or remove the decorator. TCGC does not
override explicit internal access or leak the decorated graph through a public operation.
