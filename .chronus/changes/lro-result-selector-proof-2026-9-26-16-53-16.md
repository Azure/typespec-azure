---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-core"
---

Correct `getLroMetadata` for resource create-or-replace LROs with a polling success property: `finalEnvelopeResult` now matches the complete resource selected by `finalResult`, and `logicalPath` and `finalResultPath` are cleared. Consumers relying on the previous polling envelope or extraction path must update their result handling; generated SDK return types may change. Use TCGC's scoped `@clientLroResult` to preserve an established payload-returning SDK contract.
