---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Filter read-only parameters from `SdkServiceMethod` parameters. Read-only parameters (those with `@visibility(Lifecycle.Read))` are now correctly excluded from method signatures since they cannot be set by the user.
