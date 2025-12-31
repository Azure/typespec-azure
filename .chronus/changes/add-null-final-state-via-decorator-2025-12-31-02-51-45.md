---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add legacy decorator `@nullFinalStateVia` for backward compatibility. This decorator allows language emitters to mark LRO operations to have no final state location tracking, setting `finalStateVia` to undefined.
