---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Proactively release the emitter's process-wide singleton state at the end of `$onEmit` as a hygiene measure. The context manager and the module-level SDK-type collections otherwise keep the most recently emitted program graph reachable until the next emit overwrites them; clearing them after each emit lets that memory be collected sooner when many emits run in one process (test suites, watch mode). This is bounded-to-one-program cleanup and is not a fix for any unbounded leak.
