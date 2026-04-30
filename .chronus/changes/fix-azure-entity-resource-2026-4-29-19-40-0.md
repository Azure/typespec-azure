---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `AzureEntityResource` emitting `TrackedResource` reference in OpenAPI. It now correctly references the `AzureEntityResource` definition in the ARM common-types schema.
