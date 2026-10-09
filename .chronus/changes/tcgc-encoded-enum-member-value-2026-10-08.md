---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Use the `@encodedName` of an enum member for `application/json` as its value, so enum values, discriminator values and endpoint template argument defaults match the value the member is serialized as.
