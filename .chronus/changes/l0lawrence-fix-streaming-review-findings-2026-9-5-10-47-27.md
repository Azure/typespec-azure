---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Infer effective SSE payload content types in the TypeScript emitter, gate structured-stream generation by MIME and operation kind, and stop terminal event mapping defensively. Flush JSONL UTF-8 decoding, cancel browser streams on early exit or decoding failures, preserve modeled HTTP errors, and resolve per-item JSON serialization names without changing TCGC metadata.