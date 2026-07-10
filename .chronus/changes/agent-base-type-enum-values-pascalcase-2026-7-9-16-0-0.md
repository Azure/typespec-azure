---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Align the experimental Agent base type with ARM naming and datatype guidelines: use PascalCase values for the `ResponseStatus` enum (for example `Completed`, `InProgress`), and use `utcDateTime` instead of `unixTimestamp32` for the `createdAt` timestamp properties (on `ConversationProperties` and `ResponseProperties`) to match other ARM datetime properties.
