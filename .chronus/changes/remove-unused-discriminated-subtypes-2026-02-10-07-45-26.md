---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Remove unused discriminated subtypes from discriminatedSubtypes map. When a base model has discriminated subtypes where some subtypes have no usage, only the unused subtypes are removed from the map while preserving discriminator info for used subtypes.
