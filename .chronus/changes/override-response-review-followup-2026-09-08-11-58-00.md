---
changeKind: internal
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix `@override` incorrectly reporting response diagnostics for ordinary parameter-only overrides. The override operation's declared return type is ignored again; only operations produced by `replaceResponseWithVoid` / `replaceResponseWithBytes` emit the `override-response-replacement` warning. Removed the `override-response-mismatch` diagnostic, which could not be reported without breaking existing customizations.
