---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
---

Separate native LRO protocol analysis from client-result selection. Add getLroProtocolMetadata in Azure.Core and route TCGC result selection and native model usage through protocol facts, preserving getLroMetadata and existing SDK result contracts.