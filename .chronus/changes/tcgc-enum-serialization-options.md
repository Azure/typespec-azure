---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Preserve original enum values and expose JSON/XML `@encodedName` names in enum members' `serializationOptions`, including flattened enums and example matching, without changing spec discriminator tags.
