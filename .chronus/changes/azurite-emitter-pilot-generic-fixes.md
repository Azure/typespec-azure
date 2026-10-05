---
changeKind: fix
packages:
  - "@azure-tools/typespec-azurite-emitter-pilot"
---

Fixed three transform-phase gaps surfaced while validating this pilot against a real Azure Storage TypeSpec in a companion end-to-end exercise: `Record<T>` dictionary properties were rendered as an empty interface instead of `Record<string, X>`, anonymous models were keyed by name (coalescing distinct anonymous shapes), and operations with the same name in different interfaces produced duplicate generated TS identifiers.
