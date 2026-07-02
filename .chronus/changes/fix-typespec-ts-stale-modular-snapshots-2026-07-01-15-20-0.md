---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Regenerate stale `modular-unit` scenario snapshot to match the ARM library doc changes from #4494, which moved the `ArmResourceActionAsync` operation doc to `@dev` (`@doc("")`) so those operations no longer emit a public doc comment.