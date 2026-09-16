---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Sync core to commit `057557b68`. Includes fixes for casting null parameters in generated samples and
tests ([microsoft/typespec#11967](https://github.com/microsoft/typespec/pull/11967)), redundant casts
in generated XML serializers ([microsoft/typespec#11982](https://github.com/microsoft/typespec/pull/11982)),
and generated Java path length limits
([microsoft/typespec#11983](https://github.com/microsoft/typespec/pull/11983)).
