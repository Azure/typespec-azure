---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-examples"
---

Add the `examples-resolve` tool that resolves the applicable example for each operation at a target API version (greatest `since <= target` per lineage, using the `service.yaml` order) and materializes the `{api-version}` placeholder.
