---
changeKind: feature
packages:
  - "@azure-tools/typespec-ts"
---

Generate JSONL and SSE operations returning `Promise<AsyncIterable<T>>` of deserialized items or events instead of raw byte streams, with eager HTTP validation and terminal-event handling.
