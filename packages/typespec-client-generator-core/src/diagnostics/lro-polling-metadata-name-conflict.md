This diagnostic is issued when active decorated properties on an LRO status monitor have the same
projected SDK name. The reserved generated name `operationId` also participates when
`@lroOperationId` is active.

## How to fix

Use scoped `@clientName` values that are unique for the active emitter, remove one
`@lroPollingMetadata` decorator, or remove `@lroOperationId` when its accessor is not needed.
