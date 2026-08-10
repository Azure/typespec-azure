---
changeKind: feature
packages:
  - "@azure-tools/typespec-ts"
---

Generate structured JSONL and SSE streaming operations by default. A JSONL or SSE stream response now returns `Promise<AsyncIterable<T>>` of deserialized items/events instead of the previous raw binary `Uint8Array` body. An operation returning `JsonlStream<T>` lazily decodes JSON Lines into `AsyncIterable<T>`, and an operation returning `SSEStream<T>` returns an `AsyncIterable` of the event payload types, dispatching each Server-Sent Event by its `event:` name (using `@azure/core-sse`), deserializing each payload, and stopping at the terminal event. This is the default behavior — there is no opt-in option.
