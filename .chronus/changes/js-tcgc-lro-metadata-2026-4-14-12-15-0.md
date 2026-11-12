---
changeKind: feature
packages:
  - "@azure-tools/typespec-ts"
---

Long-running operation pollers now expose LRO status metadata selected with `@lroStatusMetadata` and the operation ID selected with `@lroOperationId` as typed properties on `operationState`. Values refresh from the latest status-monitor response, remain readable after failure or cancellation, and the operation ID falls back to the polling URI, including after `restorePoller` rehydration.
