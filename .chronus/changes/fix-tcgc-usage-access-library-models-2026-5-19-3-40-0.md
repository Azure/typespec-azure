---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `@@usage` and `@@access` augment decorators being silently dropped when targeting models from imported libraries (npm packages) whose namespaces are not user-defined. Orphan type discovery now iterates the scoped decorator data for `@usage` and `@hierarchyBuilding` directly, so explicitly-tagged models are honored regardless of which namespace they live in.
