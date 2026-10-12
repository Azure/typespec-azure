This diagnostic is issued when a public operation selects polling metadata whose property or
referenced type graph has explicit, active `@access(Access.internal)`.

## How to fix

Make the operation internal, expose a public metadata type, or remove the selection. TCGC does not
override explicit internal access or leak the selected graph through a public operation.
