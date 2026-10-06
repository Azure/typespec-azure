---
changeKind: feature
packages:
  - "@azure-tools/typespec-ts"
---

Generate structured JSONL and SSE streaming operations as `Promise<AsyncIterable<T>>` of deserialized items/events instead of raw binary `Uint8Array` bodies. Connection and modeled HTTP error validation are eager; payload deserialization is lazy. Generate streaming helpers only for supported MIME types and non-paging, non-LRO operations.

SSE uses the published `@azure/core-sse` `createSseStream` API for one native HTTP response, without automatic reconnection, event-ID resumption, or retry-delay handling. Preserve ordinary operation options, headers, and caller cancellation. Dispatch named events as typed `{ event, data }` unions, infer payload-specific content types, yield typed terminal events, and suppress constant terminal sentinels.

JSONL decodes lines incrementally, flushes UTF-8 decoding at EOF, and cancels browser readers on early exit or decoding failures. Per-item deserialization uses existing TCGC serialization metadata.

Recognize standalone `TypeSpec.Streams` decorators in the shared test compiler and cover custom streams without incidental SSE imports.
