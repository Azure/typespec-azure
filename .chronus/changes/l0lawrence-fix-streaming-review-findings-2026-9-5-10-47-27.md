---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
  - "@azure-tools/typespec-client-generator-core"
---

Infer effective SSE payload content types consistently, gate structured-stream generation by MIME and operation kind, and stop terminal event mapping defensively. Flush JSONL UTF-8 decoding, cancel browser streams on early exit or decoding failures, preserve modeled HTTP errors, and propagate per-item JSON serialization names.