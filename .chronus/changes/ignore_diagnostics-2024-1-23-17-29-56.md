---
changeKind: internal
packages:
  - "@azure-tools/typespec-client-generator-core"
---

getAllModels will no longer break from the last minor release by returning a tuple with diagnostics. New function getAllModelsWithDiagnostics will return diagnostics as well if need be