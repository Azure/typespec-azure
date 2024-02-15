---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Functions `getClientType` and `getAllModels` now return a tuple of response models and diagnostics. To keep same behavior, you will need to wrap your call to these functions with `ignoreDiagnostics`