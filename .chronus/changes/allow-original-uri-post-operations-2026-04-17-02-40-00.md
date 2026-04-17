---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Allow `original-uri` final state via for POST operations in addition to PUT and PATCH. When `@useFinalStateVia("original-uri")` is specified and there is no GET operation at the original URI, a `no-operation-at-original-uri` warning diagnostic is emitted and the final result is treated as `void`.
