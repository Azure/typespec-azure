---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Restore normal slice element pointer semantics and JSON serialization for arrays of literal values, preserving supplied values, empty arrays, and nullable elements while honoring `slice-elements-byval`. Preserve acronym casing in response types for long-running operations such as `BMSPrepareDataMove`.
