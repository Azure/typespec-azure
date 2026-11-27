---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Extend `no-unnamed-types` to check implicit model responses and require concrete declarations or explicit `@friendlyName` names for generic response payloads, including dictionaries. Preserve standard friendly-named pagination and named generic response models declared by `@azure-tools/typespec-azure-core` or `@azure-tools/typespec-azure-resource-manager`, and check HTTP envelopes through their payloads.
