---
changeKind: internal
packages:
  - "@azure-tools/typespec-breaking-change"
---

Observe actual analyzer stages for source-tracing evaluation instead of replicating deduplication, resource merging, collapse and suppression; collect fallback statistics in one pass.