# `@lroOperationId` requires a status-monitor operation ID source

`@lroOperationId` identifies either a path parameter of the linked LRO status-monitor operation or
a string-like property of its response model.

## How to fix

Move the decorator to the corresponding `@path` parameter of the operation referenced by
`@pollingOperation`, or to the string-like operation ID property on that operation's response model.
