---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
---

Separate native LRO protocol analysis from client-result selection. Add getLroProtocolMetadata in Azure.Core with protocol facts grouped into required initial, polling, and completion objects alongside the top-level operation. Route TCGC result selection and native model usage through these facts, preserving all leaf field semantics, the flat getLroMetadata contract, and existing SDK result contracts.