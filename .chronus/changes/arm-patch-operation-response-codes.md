---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-client-generator-core"
---

Add the opt-in `arm-patch-operation-response-codes` rule for ARM PATCH response sets and 202 response bodies, including scoped legacy LRO markers. Allow callers to avoid re-reporting metadata-owned diagnostics and omit the original-uri GET lookup when classifying LRO protocol metadata.
