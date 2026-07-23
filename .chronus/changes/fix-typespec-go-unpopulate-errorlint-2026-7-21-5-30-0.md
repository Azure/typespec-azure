---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Emit the `unpopulate` and `unpopulateTime` serde helpers using the `%s` verb with `err.Error()` instead of the non-wrapping `%v` verb, keeping the generated code `errorlint`-clean (follow-up to the earlier `unmarshalling type %T` fix).
