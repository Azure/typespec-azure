---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-examples"
---

Add the transitional `tsp-examples-legacy-expand` tool that expands the unified examples into the concrete example for each operation at a target API version (greatest `since <= target` per lineage, using the `service.yaml` order) and materializes the `{api-version}` placeholder.
