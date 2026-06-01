---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix mismatched enum type names for `Http.File` bodies with multiple content types. The synthetic `contentType` header/method parameter now reuses the `File` model's `contentType` property type, so the enum referenced by the parameter and the enum present in `sdkPackage.enums` are the same instance (and share the same name).
