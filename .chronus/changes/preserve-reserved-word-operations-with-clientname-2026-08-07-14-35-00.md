---
changeKind: feature
packages:
  - "@azure-tools/typespec-ts"
---

Honor an explicit `@clientName` override on a reserved-word data-plane operation as an opt-out from the automatic reserved-word renaming. When an operation such as `delete` carries a `@clientName`, the emitter keeps the requested public method name (e.g. `delete`) and does not disambiguate it with the operation group or emit a `@fixme`. This provides a backwards-compatibility escape hatch for already-shipped libraries: the generated API-layer function stays guarded (`$delete`) because a reserved word is not a valid JavaScript function binding, while the public surface preserves the original name.

```tsp
@route("/conversations")
interface Conversations {
  // Keep `delete` as the generated method name instead of `deleteConversation`.
  @delete
  @clientName("delete", "javascript")
  delete(@path conversationName: string): void;
}
```
