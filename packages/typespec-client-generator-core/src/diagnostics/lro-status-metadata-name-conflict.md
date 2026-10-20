# LRO status metadata name conflict

Two selected LRO status metadata properties project to the same SDK client name, or a selected
property conflicts with the reserved `operationId` metadata name.

## How to fix

Use `@clientName` with non-overlapping emitter scopes or remove one of the conflicting selections.
