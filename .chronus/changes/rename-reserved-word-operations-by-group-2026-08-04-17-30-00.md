---
changeKind: feature
packages:
  - "@azure-tools/typespec-ts"
---

Rename reserved-word operations (e.g. `delete`) that belong to an operation group by suffixing the singularized group name instead of emitting a `@fixme`. For example, `Conversations.delete` is now generated as `deleteConversation` rather than `$delete` with a fixme doc comment. Operations without an operation group continue to fall back to the previous guarded name and `@fixme` guidance.

An explicit `@clientName` override opts out of this renaming: when a reserved-word operation carries a `@clientName`, the emitter keeps the requested public method name (e.g. `delete`) and does not disambiguate it with the operation group or emit a `@fixme`. This provides a backwards-compatibility escape hatch for already-shipped libraries. The generated API-layer function stays guarded (`$delete`) because a reserved word is not a valid JavaScript function binding, while the public surface preserves the original name.

```tsp
@route("/conversations")
interface Conversations {
  // Keep `delete` as the generated method name instead of `deleteConversation`.
  @delete
  @clientName("delete", "javascript")
  delete(@path conversationName: string): void;
}
```
