---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Batch ts-morph mutations across modular emit phases (`emitTypes`, `buildSubpathIndexFile`, `buildRootIndex`, `buildSubClientIndexFile`) via a new reusable `framework/source-file-batch.ts`. Each individual `sourceFile.addX(...)` in ts-morph 23 re-parses the entire file; the batch collapses N re-parses into one per `StructureKind` per file by routing writes through `enqueueStatement` and dispatching via the per-kind bulk APIs on flush. Significantly reduces `tsp compile` time on large ARM specs.
