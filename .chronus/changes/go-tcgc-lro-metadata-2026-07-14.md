---
changeKind: feature
packages:
  - "@azure-tools/typespec-go"
---

Long-running operations that use `@lroStatusMetadata` or `@lroOperationId` now return a per-operation poller type that embeds `*runtime.Poller[T]`. It adds a `StatusMetadata()` method with the selected properties from the latest status monitor response and an `OperationID()` method that reads the ID from the polling URL or the status monitor body. Both work after the poller is resumed from a resume token.
