---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `@alternateType` decorator incorrectly treating regular TypeSpec models as external types

Fixed regression where regular TypeSpec models (like `Azure.ResourceManager.Foundations.ManagedServiceIdentity`) were incorrectly treated as external types, causing TCGC to return "unknown" type instead of the proper model type.
