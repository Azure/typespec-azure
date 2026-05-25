---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix example value matching for `decimal` and `decimal128` typed properties. JSON `number` values in example files are now correctly recognized as matching `decimal` / `decimal128` typed properties.
