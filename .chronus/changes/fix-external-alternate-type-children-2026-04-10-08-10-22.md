---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Types that are only used within external alternate types are no longer included in sdkPackage models, enums, or unions.
