---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix crash (`Cannot read properties of undefined (reading 'properties')`) in `reorderParameters`, `addParameter`, `removeParameter`, `replaceParameter`, and `@override` when an invalid (e.g. unresolvable) operation reference is passed. A diagnostic is now reported instead. Also call `finishType` on cloned model properties and operations so copied decorators are applied correctly.
