---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Fix generated examples for models with `AdditionalProperties` maps to use map literals instead of pointers to maps, preserving pointer-valued entries.
