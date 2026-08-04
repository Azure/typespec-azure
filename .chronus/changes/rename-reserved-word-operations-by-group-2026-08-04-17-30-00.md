---
changeKind: feature
packages:
  - "@azure-tools/typespec-ts"
---

Rename reserved-word operations (e.g. `delete`) that belong to an operation group by suffixing the singularized group name instead of emitting a `@fixme`. For example, `Conversations.delete` is now generated as `deleteConversation` rather than `$delete` with a fixme doc comment. Operations without an operation group continue to fall back to the previous guarded name and `@fixme` guidance.
