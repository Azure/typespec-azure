# `@lroOperationId` requires a path parameter

`@lroOperationId` identifies the path parameter on an explicitly linked LRO status-monitor
operation that contains the server-issued operation identifier.

## How to fix

Move the decorator to the corresponding `@path` parameter of the operation referenced by
`@pollingOperation`.
