This diagnostic is issued when `@clientLocation` requests a move that conflicts with the client model TCGC is building.

To fix this issue, move operations only to interfaces or namespaces, move model properties only to valid client targets, avoid `@clientInitialization` conflicts, and keep moved parameter names and types consistent.

### Example

Instead of moving an operation to another operation:

```typespec
using Azure.ClientGenerator.Core;

op destination(): void;

@clientLocation(destination)
op source(): void;
```

Move the operation to an interface or namespace:

```typespec
interface Operations {}

@clientLocation(Operations)
op source(): void;
```
