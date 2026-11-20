---
changeKind: feature
packages:
  - "@azure-tools/typespec-java"
---

Expose `getOperationId()` on generated poll results for LROs with `@lroOperationId`, using the status-monitor body when available and the polling URL path otherwise. Status metadata selected with `@lroStatusMetadata` remains available from the latest typed poll response.
