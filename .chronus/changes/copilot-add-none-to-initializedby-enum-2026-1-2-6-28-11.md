---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Added `InitializedBy.none` (value 0) to allow TypeSpec authors to indicate that client constructors should be omitted and hand-written. Note: The internal `InitializedByFlags.Default` value changed from `0` to `-1` to accommodate this addition.