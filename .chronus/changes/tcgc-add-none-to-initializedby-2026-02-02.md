---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Added `None` (value 0) to the `InitializedBy` enum to allow TypeSpec authors to indicate that client constructors should be omitted and hand-written. This addresses scenarios where generated constructors need to be replaced with custom implementations, such as for storage clients that require special initialization logic.
