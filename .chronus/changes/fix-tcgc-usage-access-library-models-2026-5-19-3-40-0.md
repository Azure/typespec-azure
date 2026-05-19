---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `@@usage` and `@@access` augment decorators being silently dropped when targeting models from imported libraries (npm packages) whose namespaces are not user-defined. Explicitly-tagged models are now honored regardless of which namespace they live in.
