---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
---

Resource PUT long-running operations with a polling success property now select that property type as the final result instead of the resource type. The polling envelope and extraction path are preserved. This corrects inconsistent result metadata in both Core getLroMetadata and native TCGC metadata, and can change affected generated SDK return types and AutoRest final-state schemas. Polling and final-request strategies are unchanged.