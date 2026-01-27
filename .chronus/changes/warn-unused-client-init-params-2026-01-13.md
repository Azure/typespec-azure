---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add warning diagnostic for unused client initialization parameters. If `clientInitialization.parameters` contains values that aren't used in any routes (client or its sub-clients), a diagnostic warning is now produced.
