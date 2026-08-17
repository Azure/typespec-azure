---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Sync core to microsoft/typespec commit `1a1583554b`. Fix management generation to omit models and enums configured with `remove-model` (core [#11698](https://github.com/microsoft/typespec/pull/11698)).
