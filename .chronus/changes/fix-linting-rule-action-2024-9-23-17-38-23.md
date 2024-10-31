---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix the `arm-resource-invalid-action-verb` rule. The rule should only allow `@post` and `@get` verbs, but it wasn't flagging other verbs.
