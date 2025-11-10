---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Filter ReadOnly parameters from SdkServiceMethod parameters. ReadOnly parameters (those with @visibility(Lifecycle.Read)) are now correctly excluded from method signatures since they cannot be set by the user.
