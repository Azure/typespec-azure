---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Changed `InitializedByFlags.Default` back to `0` to indicate no user-specific initialization setting. Renamed `InitializedByFlags.None` to `InitializedByFlags.CustomizeCode` and `InitializedBy.none` to `InitializedBy.customizeCode` to indicate that client initialization should be omitted from generated code and handled manually in custom code.
