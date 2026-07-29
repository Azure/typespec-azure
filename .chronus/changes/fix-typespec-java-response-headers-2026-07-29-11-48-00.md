---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Sync core to microsoft/typespec commit `d320a53b`. Return response headers as a model from the convenience method when the operation has response headers (core [#11420](https://github.com/microsoft/typespec/pull/11420)).