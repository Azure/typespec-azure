---
changeKind: feature
packages:
  - "@azure-tools/typespec-ts"
---

Generate structured JSONL and SSE streaming operations by default. A JSONL or SSE stream response now returns `Promise<AsyncIterable<T>>` of deserialized items/events instead of the previous raw binary `Uint8Array` body. An operation returning `JsonlStream<T>` lazily decodes JSON Lines into `AsyncIterable<T>`, and an operation returning `SSEStream<T>` returns an `AsyncIterable` of the event payload types, dispatching each Server-Sent Event by its `event:` name, deserializing each payload, and stopping at the TypeSpec terminal event.

SSE operations use the published `@azure/core-sse` `createSseStream` API for a single HTTP response, without automatic reconnection, event-ID resumption, or retry-delay handling. Connection and HTTP error validation remain eager while typed event deserialization is lazy. Ordinary operation options, headers, and caller cancellation are preserved.
